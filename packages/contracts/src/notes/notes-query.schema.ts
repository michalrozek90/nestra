import { z } from 'zod';

export const notesQuerySchema = z.strictObject({
  archived: z.enum(['true', 'false']).transform((archived) => archived === 'true'),
});

export type NotesQuery = z.infer<typeof notesQuerySchema>;
