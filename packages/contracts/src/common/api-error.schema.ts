import { z } from 'zod';

export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_ACCESS_TOKEN_INVALID',
  'AUTH_REFRESH_TOKEN_INVALID',
  'AUTH_SESSION_EXPIRED',
  'AUTH_EMAIL_ALREADY_REGISTERED',
  'ROUTE_NOT_FOUND',
  'NOTE_NOT_FOUND',
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const validationIssueSchema = z.strictObject({
  fieldPath: z.string(),
  errorCode: z.string(),
});

export const apiErrorResponseSchema = z.strictObject({
  statusCode: z.number().int().min(400).max(599),
  errorCode: apiErrorCodeSchema,
  message: z.string().min(1),
  validationIssues: z.array(validationIssueSchema).readonly().optional(),
  requestPath: z.string().min(1),
  requestId: z.uuid().optional(),
  timestamp: z.iso.datetime(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
