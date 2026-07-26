import { z } from 'zod';

import { deriveNoteTitle, NOTE_TITLE_MAX_LENGTH, noteDocumentSchema } from './note-document';

export const noteSchema = z
  .strictObject({
    id: z.uuid(),
    title: z.string().min(1).max(NOTE_TITLE_MAX_LENGTH),
    document: noteDocumentSchema,
    isPinned: z.boolean(),
    isTrashed: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .refine(({ document, title }) => title === deriveNoteTitle(document), {
    message: 'The note title must match the title derived from the document.',
    path: ['title'],
  });

export type Note = z.infer<typeof noteSchema>;
