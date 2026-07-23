import { z } from 'zod';

export const noteSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(20_000),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Note = z.infer<typeof noteSchema>;
