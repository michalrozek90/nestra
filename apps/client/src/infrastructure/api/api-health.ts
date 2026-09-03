import { healthResponseSchema, type HealthResponse } from '@nestra/contracts';
import axios from 'axios';

import { AUTH_REQUEST_TIMEOUT_MS, apiClient, type ApiRequestConfig } from './api-client';

const API_READINESS_RETRY_DELAY_MS = 1_000;
const healthRequestConfig: Partial<ApiRequestConfig> = {
  _skipDiagnostics: true,
};

async function requestApiHealth(timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<HealthResponse> {
  const response = await apiClient.get<unknown>('/health', {
    ...healthRequestConfig,
    timeout: timeoutMs,
  });
  return healthResponseSchema.parse(response.data);
}

export async function verifyApiReadiness(): Promise<void> {
  const readinessDeadline = Date.now() + AUTH_REQUEST_TIMEOUT_MS;

  while (true) {
    try {
      await requestApiHealth(readinessDeadline - Date.now());
      return;
    } catch (error: unknown) {
      const isRecoverableReadinessError =
        axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
      if (!isRecoverableReadinessError) {
        throw error;
      }

      const remainingWaitMs = readinessDeadline - Date.now();
      if (remainingWaitMs <= 0) {
        throw error;
      }

      await wait(Math.min(API_READINESS_RETRY_DELAY_MS, remainingWaitMs));
    }
  }
}

export async function getApiHealth(): Promise<HealthResponse> {
  try {
    return await requestApiHealth();
  } catch (error: unknown) {
    // Degraded health returns HTTP 503 with a still-valid body for diagnostics.
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      return healthResponseSchema.parse(error.response.data);
    }

    throw error;
  }
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
