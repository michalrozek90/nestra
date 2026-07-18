import { z } from 'zod';

export const healthResponseSchema = z.strictObject({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['reachable', 'unreachable']),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
