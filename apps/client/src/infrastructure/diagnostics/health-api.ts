import { healthResponseSchema, type HealthResponse } from '@nestra/contracts';
import axios from 'axios';

import {
  AUTH_REQUEST_TIMEOUT_MS,
  apiClient,
  type ApiRequestConfig,
} from '@/infrastructure/api/api-client';

export async function getApiHealth(): Promise<HealthResponse> {
  const requestConfig: Partial<ApiRequestConfig> = {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
    _skipDiagnostics: true,
  };

  try {
    const response = await apiClient.get<unknown>('/health', requestConfig);
    return healthResponseSchema.parse(response.data);
  } catch (error: unknown) {
    // Degraded health returns HTTP 503 with a still-valid body for diagnostics.
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      return healthResponseSchema.parse(error.response.data);
    }

    throw error;
  }
}
