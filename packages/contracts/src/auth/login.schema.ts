import { z } from 'zod';

export const loginRequestSchema = z.strictObject({
  email: z.string().trim().min(1).max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
