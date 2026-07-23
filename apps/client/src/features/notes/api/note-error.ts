import { apiErrorResponseSchema } from '@nestra/contracts';
import { isAxiosError } from 'axios';

export type NoteErrorTranslationKey =
  'errors.notFound' | 'errors.validationFailed' | 'errors.serviceUnavailable' | 'errors.unexpected';

export function getNoteErrorTranslationKey(error: unknown): NoteErrorTranslationKey {
  if (!isAxiosError(error)) {
    return 'errors.unexpected';
  }

  const parsedError = apiErrorResponseSchema.safeParse(error.response?.data);
  if (parsedError.success) {
    switch (parsedError.data.errorCode) {
      case 'NOTE_NOT_FOUND':
        return 'errors.notFound';
      case 'VALIDATION_FAILED':
        return 'errors.validationFailed';
      case 'SERVICE_UNAVAILABLE':
        return 'errors.serviceUnavailable';
      case 'AUTH_ACCESS_TOKEN_INVALID':
      case 'AUTH_EMAIL_ALREADY_REGISTERED':
      case 'AUTH_INVALID_CREDENTIALS':
      case 'AUTH_REFRESH_TOKEN_INVALID':
      case 'AUTH_SESSION_EXPIRED':
      case 'INTERNAL_SERVER_ERROR':
      case 'ROUTE_NOT_FOUND':
        return 'errors.unexpected';
    }
  }

  return error.response ? 'errors.unexpected' : 'errors.serviceUnavailable';
}
