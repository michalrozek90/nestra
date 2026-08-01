import { authenticationSessionResponseSchema } from '@nestra/contracts';
import axios, { type InternalAxiosRequestConfig } from 'axios';

import { runtimeConfig } from '@/config/runtime-config';
import {
  recordFailedApiRequest,
  recordSuccessfulApiRequest,
} from '@/infrastructure/diagnostics/api-diagnostics';
import { logger } from '@/infrastructure/logging/logger';
import { persistAuthenticationSessionTokens } from '@/infrastructure/auth/auth-session-storage';
import { authTokenStorage } from '@/infrastructure/auth/auth-token-storage';

type AuthenticatedRequestConfig = InternalAxiosRequestConfig & {
  _authRetryAttempted?: boolean;
  _authSessionId?: string;
};

type AuthenticationFailureHandler = () => void;

const AUTH_HEADER_EXCLUDED_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
] as const;
const REFRESH_EXCLUDED_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
] as const;
const REFRESH_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const authenticationFailureHandlers = new Set<AuthenticationFailureHandler>();
let refreshPromise: Promise<string> | null = null;

/** Per-request timeout for auth calls that must tolerate hosted free-tier cold starts. */
export const AUTH_REQUEST_TIMEOUT_MS = 60_000;

export const apiClient = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
  timeout: 10_000,
});

function requestMatchesPath(
  requestUrl: string | undefined,
  excludedPaths: readonly string[],
): boolean {
  return excludedPaths.some((path) => requestUrl?.endsWith(path) === true);
}

function getRefreshSessionId(refreshToken: string | null): string | null {
  if (!refreshToken) {
    return null;
  }

  const separatorIndex = refreshToken.indexOf('.');
  if (separatorIndex <= 0) {
    return null;
  }

  const refreshSessionId = refreshToken.slice(0, separatorIndex);
  return REFRESH_SESSION_ID_PATTERN.test(refreshSessionId) ? refreshSessionId : null;
}

async function rotateSession(): Promise<string> {
  const refreshToken = await authTokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('An authentication refresh cannot be performed without a refresh token.');
  }

  const response = await apiClient.post<unknown>(
    '/auth/refresh',
    { refreshToken },
    { timeout: AUTH_REQUEST_TIMEOUT_MS },
  );
  const session = authenticationSessionResponseSchema.parse(response.data);
  await persistAuthenticationSessionTokens(session);
  return session.accessToken;
}

async function getRotatedAccessToken(): Promise<string> {
  refreshPromise ??= rotateSession().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function invalidateAuthentication(): Promise<void> {
  try {
    await authTokenStorage.clear();
  } catch (error: unknown) {
    logger.error('Authentication tokens could not be cleared', error);
  }

  authenticationFailureHandlers.forEach((handler) => handler());
}

export function registerAuthenticationFailureHandler(
  handler: AuthenticationFailureHandler,
): () => void {
  authenticationFailureHandlers.add(handler);
  return () => authenticationFailureHandlers.delete(handler);
}

apiClient.interceptors.request.use(async (config) => {
  if (requestMatchesPath(config.url, AUTH_HEADER_EXCLUDED_PATHS)) {
    return config;
  }

  const [accessToken, refreshToken] = await Promise.all([
    authTokenStorage.getAccessToken(),
    authTokenStorage.getRefreshToken(),
  ]);
  const refreshSessionId = getRefreshSessionId(refreshToken);
  if (refreshSessionId) {
    (config as AuthenticatedRequestConfig)._authSessionId = refreshSessionId;
  }
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    recordSuccessfulApiRequest(response);
    return response;
  },
  async (error: unknown) => {
    recordFailedApiRequest(error);
    if (!axios.isAxiosError(error) || !error.response || error.response.status >= 500) {
      logger.warn('API request did not complete successfully');
    }

    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const requestConfig = error.config as AuthenticatedRequestConfig;
    if (
      requestConfig._authRetryAttempted === true ||
      requestMatchesPath(requestConfig.url, REFRESH_EXCLUDED_PATHS)
    ) {
      return Promise.reject(error);
    }

    let currentAccessToken: string | null;
    let currentRefreshSessionId: string | null;
    try {
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        authTokenStorage.getAccessToken(),
        authTokenStorage.getRefreshToken(),
      ]);
      currentAccessToken = storedAccessToken;
      currentRefreshSessionId = getRefreshSessionId(storedRefreshToken);
    } catch (storageError: unknown) {
      await invalidateAuthentication();
      return Promise.reject(storageError);
    }

    if (!currentRefreshSessionId) {
      await invalidateAuthentication();
      return Promise.reject(error);
    }

    if (!requestConfig._authSessionId || currentRefreshSessionId !== requestConfig._authSessionId) {
      // A response from an earlier login must never be replayed under the current session.
      return Promise.reject(error);
    }

    requestConfig._authRetryAttempted = true;
    if (
      currentAccessToken &&
      requestConfig.headers.get('Authorization') !== `Bearer ${currentAccessToken}`
    ) {
      requestConfig.headers.set('Authorization', `Bearer ${currentAccessToken}`);
      return apiClient.request(requestConfig);
    }

    try {
      const accessToken = await getRotatedAccessToken();
      requestConfig.headers.set('Authorization', `Bearer ${accessToken}`);
      return await apiClient.request(requestConfig);
    } catch (refreshError: unknown) {
      await invalidateAuthentication();
      return Promise.reject(refreshError);
    }
  },
);
