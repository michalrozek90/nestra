import { z } from 'zod';

import { normalizedNoteDocumentSchema } from './note-document';

export const createNoteSchema = z.strictObject({
  document: normalizedNoteDocumentSchema,
});

export type CreateNote = z.infer<typeof createNoteSchema>;
