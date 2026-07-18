import axios from 'axios';

import { runtimeConfig } from '@/config/runtime-config';
import {
  recordFailedApiRequest,
  recordSuccessfulApiRequest,
} from '@/infrastructure/diagnostics/api-diagnostics';
import { logger } from '@/infrastructure/logging/logger';

export const apiClient = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => {
    recordSuccessfulApiRequest(response);
    return response;
  },
  (error: unknown) => {
    recordFailedApiRequest(error);
    logger.error('API request failed', error);
    return Promise.reject(error);
  },
);
