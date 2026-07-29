import {
  authenticationSessionResponseSchema,
  loginRequestSchema,
  logoutRequestSchema,
  publicUserSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type AuthenticationSessionResponse,
  type LoginRequest,
  type LogoutRequest,
  type PublicUser,
  type RefreshRequest,
  type RegisterRequest,
} from '@nestra/contracts';

import { AUTH_REQUEST_TIMEOUT_MS, apiClient } from '@/infrastructure/api/api-client';

const authRequestConfig = { timeout: AUTH_REQUEST_TIMEOUT_MS } as const;

export async function registerAccount(
  request: RegisterRequest,
): Promise<AuthenticationSessionResponse> {
  const validatedRequest = registerRequestSchema.parse(request);
  const response = await apiClient.post<unknown>(
    '/auth/register',
    validatedRequest,
    authRequestConfig,
  );
  return authenticationSessionResponseSchema.parse(response.data);
}

export async function login(request: LoginRequest): Promise<AuthenticationSessionResponse> {
  const validatedRequest = loginRequestSchema.parse(request);
  const response = await apiClient.post<unknown>(
    '/auth/login',
    validatedRequest,
    authRequestConfig,
  );
  return authenticationSessionResponseSchema.parse(response.data);
}

export async function refreshSession(
  request: RefreshRequest,
): Promise<AuthenticationSessionResponse> {
  const validatedRequest = refreshRequestSchema.parse(request);
  const response = await apiClient.post<unknown>(
    '/auth/refresh',
    validatedRequest,
    authRequestConfig,
  );
  return authenticationSessionResponseSchema.parse(response.data);
}

export async function logout(request: LogoutRequest): Promise<void> {
  await apiClient.post('/auth/logout', logoutRequestSchema.parse(request), authRequestConfig);
}

export async function getCurrentUser(): Promise<PublicUser> {
  const response = await apiClient.get<unknown>('/auth/me', authRequestConfig);
  return publicUserSchema.parse(response.data);
}
