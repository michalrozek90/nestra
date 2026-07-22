import { z } from 'zod';

export const registerRequestSchema = z.strictObject({
  email: z.string().trim().min(1).max(254).pipe(z.email()),
  password: z.string().min(7).max(128),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
