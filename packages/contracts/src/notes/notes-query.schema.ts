import { z } from 'zod';

export const notesQuerySchema = z.strictObject({
  trashed: z.enum(['true', 'false']).transform((trashed) => trashed === 'true'),
});

export type NotesQuery = z.infer<typeof notesQuerySchema>;
