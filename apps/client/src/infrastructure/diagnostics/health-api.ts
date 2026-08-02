import { healthResponseSchema, type HealthResponse } from '@nestra/contracts';
import axios from 'axios';

import { AUTH_REQUEST_TIMEOUT_MS, apiClient } from '@/infrastructure/api/api-client';

export async function getApiHealth(): Promise<HealthResponse> {
  try {
    const response = await apiClient.get<unknown>('/health', {
      timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
    return healthResponseSchema.parse(response.data);
  } catch (error: unknown) {
    // Degraded health returns HTTP 503 with a still-valid body for diagnostics.
    if (axios.isAxiosError(error) && error.response?.status === 503) {
      return healthResponseSchema.parse(error.response.data);
    }

    throw error;
  }
}
