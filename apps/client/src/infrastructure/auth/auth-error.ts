import { apiErrorResponseSchema, type ApiErrorCode } from '@nestra/contracts';
import { isAxiosError } from 'axios';

import { AuthenticationSessionStorageError } from './auth-session-storage';

export type AuthErrorTranslationKey =
  | 'errors.invalidCredentials'
  | 'errors.emailAlreadyRegistered'
  | 'errors.sessionExpired'
  | 'errors.sessionStorageUnavailable'
  | 'errors.validationFailed'
  | 'errors.serviceUnavailable'
  | 'errors.google.provider'
  | 'errors.google.invalidCallback'
  | 'errors.google.expiredHandoff'
  | 'errors.google.usedHandoff'
  | 'errors.google.emailUnverified'
  | 'errors.google.emailMismatch'
  | 'errors.google.identityConflict'
  | 'errors.google.unavailable'
  | 'errors.unexpected';

function mapApiErrorCode(errorCode: ApiErrorCode): AuthErrorTranslationKey {
  switch (errorCode) {
    case 'AUTH_INVALID_CREDENTIALS':
    case 'AUTH_REAUTHENTICATION_FAILED':
      return 'errors.invalidCredentials';
    case 'AUTH_EMAIL_ALREADY_REGISTERED':
      return 'errors.emailAlreadyRegistered';
    case 'AUTH_ACCESS_TOKEN_INVALID':
    case 'AUTH_REFRESH_TOKEN_INVALID':
    case 'AUTH_SESSION_EXPIRED':
      return 'errors.sessionExpired';
    case 'VALIDATION_FAILED':
      return 'errors.validationFailed';
    case 'SERVICE_UNAVAILABLE':
      return 'errors.serviceUnavailable';
    case 'AUTH_GOOGLE_UNAVAILABLE':
      return 'errors.google.unavailable';
    case 'AUTH_GOOGLE_PROVIDER_ERROR':
      return 'errors.google.provider';
    case 'AUTH_GOOGLE_RESPONSE_INVALID':
    case 'AUTH_GOOGLE_HANDOFF_INVALID':
      return 'errors.google.invalidCallback';
    case 'AUTH_GOOGLE_HANDOFF_EXPIRED':
      return 'errors.google.expiredHandoff';
    case 'AUTH_GOOGLE_HANDOFF_ALREADY_USED':
      return 'errors.google.usedHandoff';
    case 'AUTH_GOOGLE_EMAIL_UNVERIFIED':
      return 'errors.google.emailUnverified';
    case 'AUTH_GOOGLE_EMAIL_MISMATCH':
      return 'errors.google.emailMismatch';
    case 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED':
    case 'AUTH_EXTERNAL_IDENTITY_CONFLICT':
      return 'errors.google.identityConflict';
    case 'INTERNAL_SERVER_ERROR':
    case 'NOTE_NOT_FOUND':
    case 'NOTE_NOT_TRASHED':
    case 'ROUTE_NOT_FOUND':
    case 'AUTH_GOOGLE_CANCELLED':
    case 'AUTH_ACCOUNT_LINK_REQUIRED':
      return 'errors.unexpected';
  }
}

export function getAuthApiErrorCode(error: unknown): ApiErrorCode | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const parsedError = apiErrorResponseSchema.safeParse(error.response?.data);
  return parsedError.success ? parsedError.data.errorCode : null;
}

export function getAuthErrorTranslationKey(error: unknown): AuthErrorTranslationKey {
  if (error instanceof AuthenticationSessionStorageError) {
    return 'errors.sessionStorageUnavailable';
  }

  if (!isAxiosError(error)) {
    return 'errors.unexpected';
  }

  const parsedError = apiErrorResponseSchema.safeParse(error.response?.data);
  if (parsedError.success) {
    return mapApiErrorCode(parsedError.data.errorCode);
  }

  return error.response ? 'errors.unexpected' : 'errors.serviceUnavailable';
}

export function isRecoverableConnectionError(error: unknown): boolean {
  return isAxiosError(error) && (!error.response || error.response.status >= 500);
}
