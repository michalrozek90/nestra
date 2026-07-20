import { z } from 'zod';

const normalizedEmailSchema = z
  .string()
  .trim()
  .transform((email) => email.toLowerCase())
  .pipe(z.email().max(254));

export function normalizeEmail(email: string): string {
  return normalizedEmailSchema.parse(email);
}
