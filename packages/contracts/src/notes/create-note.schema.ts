import { z } from 'zod';

export const createNoteSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().max(20_000).default(''),
});

export type CreateNote = z.infer<typeof createNoteSchema>;
