import { apiErrorResponseSchema, type ApiErrorCode } from '@nestra/contracts';
import { isAxiosError } from 'axios';

export type AuthErrorTranslationKey =
  | 'errors.invalidCredentials'
  | 'errors.emailAlreadyRegistered'
  | 'errors.sessionExpired'
  | 'errors.validationFailed'
  | 'errors.serviceUnavailable'
  | 'errors.unexpected';

function mapApiErrorCode(errorCode: ApiErrorCode): AuthErrorTranslationKey {
  switch (errorCode) {
    case 'AUTH_INVALID_CREDENTIALS':
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
    case 'INTERNAL_SERVER_ERROR':
    case 'NOTE_NOT_FOUND':
    case 'ROUTE_NOT_FOUND':
      return 'errors.unexpected';
  }
}

export function getAuthErrorTranslationKey(error: unknown): AuthErrorTranslationKey {
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
