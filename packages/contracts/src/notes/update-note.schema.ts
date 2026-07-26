import { z } from 'zod';

import { normalizedNoteDocumentSchema } from './note-document';

export const updateNoteSchema = z
  .strictObject({
    document: normalizedNoteDocumentSchema.optional(),
    isPinned: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
  })
  .refine(
    ({ document, isPinned, isTrashed }) =>
      document !== undefined || isPinned !== undefined || isTrashed !== undefined,
    {
      message: 'At least one supported note field is required.',
    },
  );

export type UpdateNote = z.infer<typeof updateNoteSchema>;
