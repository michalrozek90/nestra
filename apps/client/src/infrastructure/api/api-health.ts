import { healthResponseSchema, type HealthResponse } from '@nestra/contracts';
import axios from 'axios';

import { AUTH_REQUEST_TIMEOUT_MS, apiClient, type ApiRequestConfig } from './api-client';

const healthRequestConfig: Partial<ApiRequestConfig> = {
  timeout: AUTH_REQUEST_TIMEOUT_MS,
  _skipDiagnostics: true,
};

async function requestApiHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<unknown>('/health', healthRequestConfig);
  return healthResponseSchema.parse(response.data);
}

export async function verifyApiReadiness(): Promise<void> {
  await requestApiHealth();
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
