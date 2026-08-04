import { z } from 'zod';

const base64UrlSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const googleAuthPlatformSchema = z.enum(['web', 'android', 'ios', 'desktop']);

export const googleAuthStartRequestSchema = z.strictObject({
  platform: googleAuthPlatformSchema,
  handoffChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

export const googleLinkStartRequestSchema = googleAuthStartRequestSchema.extend({
  currentPassword: z.string().min(1).max(1_024),
});

export const googleAuthStartResponseSchema = z.strictObject({
  transactionId: z.uuid(),
  authorizationUrl: z.url(),
  transactionExpiresAt: z.iso.datetime(),
});

export const googleAuthExchangeRequestSchema = z.strictObject({
  handoffCode: z.string().regex(/^[0-9a-fA-F-]{36}\.[A-Za-z0-9_-]+$/),
  // 32 random bytes encode to at least 43 base64url characters without padding.
  handoffVerifier: base64UrlSchema.min(43),
});

export const externalIdentityResponseSchema = z.strictObject({
  provider: z.literal('google'),
  email: z.email(),
  linkedAt: z.iso.datetime(),
});

export type GoogleAuthPlatform = z.infer<typeof googleAuthPlatformSchema>;
export type GoogleAuthStartRequest = z.infer<typeof googleAuthStartRequestSchema>;
export type GoogleLinkStartRequest = z.infer<typeof googleLinkStartRequestSchema>;
export type GoogleAuthStartResponse = z.infer<typeof googleAuthStartResponseSchema>;
export type GoogleAuthExchangeRequest = z.infer<typeof googleAuthExchangeRequestSchema>;
export type ExternalIdentityResponse = z.infer<typeof externalIdentityResponseSchema>;
