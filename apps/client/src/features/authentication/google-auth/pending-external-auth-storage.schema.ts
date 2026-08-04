import { googleAuthPlatformSchema } from '@nestra/contracts';
import { z } from 'zod';

export const pendingExternalAuthSchema = z.strictObject({
  intent: z.enum(['sign-in', 'link']),
  platform: googleAuthPlatformSchema,
  transactionId: z.uuid(),
  handoffVerifier: z.string().regex(/^[A-Za-z0-9_-]{43,}$/),
  transactionExpiresAt: z.iso.datetime(),
});
