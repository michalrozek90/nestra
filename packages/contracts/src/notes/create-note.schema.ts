import { z } from 'zod';

export const createNoteSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(20_000),
});

export type CreateNote = z.infer<typeof createNoteSchema>;
