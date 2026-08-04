import { apiErrorResponseSchema } from '@nestra/contracts';
import { isAxiosError } from 'axios';

export type NoteErrorTranslationKey =
  | 'errors.notFound'
  | 'errors.notTrashed'
  | 'errors.validationFailed'
  | 'errors.serviceUnavailable'
  | 'errors.unexpected';

export function isNoteNotFoundError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const parsedError = apiErrorResponseSchema.safeParse(error.response?.data);
  return parsedError.success && parsedError.data.errorCode === 'NOTE_NOT_FOUND';
}

export function getNoteErrorTranslationKey(error: unknown): NoteErrorTranslationKey {
  if (!isAxiosError(error)) {
    return 'errors.unexpected';
  }

  const parsedError = apiErrorResponseSchema.safeParse(error.response?.data);
  if (parsedError.success) {
    switch (parsedError.data.errorCode) {
      case 'NOTE_NOT_FOUND':
        return 'errors.notFound';
      case 'NOTE_NOT_TRASHED':
        return 'errors.notTrashed';
      case 'VALIDATION_FAILED':
        return 'errors.validationFailed';
      case 'SERVICE_UNAVAILABLE':
        return 'errors.serviceUnavailable';
      case 'AUTH_ACCESS_TOKEN_INVALID':
      case 'AUTH_EMAIL_ALREADY_REGISTERED':
      case 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED':
      case 'AUTH_EXTERNAL_IDENTITY_CONFLICT':
      case 'AUTH_INVALID_CREDENTIALS':
      case 'AUTH_REFRESH_TOKEN_INVALID':
      case 'AUTH_SESSION_EXPIRED':
      case 'AUTH_GOOGLE_UNAVAILABLE':
      case 'AUTH_GOOGLE_CANCELLED':
      case 'AUTH_GOOGLE_PROVIDER_ERROR':
      case 'AUTH_GOOGLE_RESPONSE_INVALID':
      case 'AUTH_GOOGLE_HANDOFF_INVALID':
      case 'AUTH_GOOGLE_HANDOFF_EXPIRED':
      case 'AUTH_GOOGLE_HANDOFF_ALREADY_USED':
      case 'AUTH_GOOGLE_EMAIL_UNVERIFIED':
      case 'AUTH_GOOGLE_EMAIL_MISMATCH':
      case 'AUTH_ACCOUNT_LINK_REQUIRED':
      case 'AUTH_REAUTHENTICATION_FAILED':
      case 'INTERNAL_SERVER_ERROR':
      case 'ROUTE_NOT_FOUND':
        return 'errors.unexpected';
    }
  }

  return error.response ? 'errors.unexpected' : 'errors.serviceUnavailable';
}
