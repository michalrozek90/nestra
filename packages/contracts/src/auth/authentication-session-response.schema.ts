import { z } from 'zod';

import { publicUserSchema } from './public-user.schema';

export const authenticationSessionResponseSchema = z.strictObject({
  user: publicUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshSessionExpiresAt: z.iso.datetime(),
});

export type AuthenticationSessionResponse = z.infer<typeof authenticationSessionResponseSchema>;
