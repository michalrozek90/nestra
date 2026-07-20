import { z } from 'zod';

export const refreshRequestSchema = z.strictObject({
  refreshToken: z.string().min(1),
});

export const logoutRequestSchema = z.strictObject({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
