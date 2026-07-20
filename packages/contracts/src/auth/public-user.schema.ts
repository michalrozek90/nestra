import { z } from 'zod';

export const publicUserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
