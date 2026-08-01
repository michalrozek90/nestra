import { z } from 'zod';

export const NOTE_TITLE_MAX_LENGTH = 240;
export const NOTE_DOCUMENT_MAX_LENGTH = 20_122;

export function normalizeNoteDocument(document: string): string {
  return document.replace(/\r\n?|\u2028|\u2029/g, '\n').trim();
}

export function deriveNoteTitle(document: string): string | null {
  const normalizedDocument = normalizeNoteDocument(document);
  const firstNonEmptyLine = normalizedDocument.split('\n').find((line) => line.trim().length > 0);

  return firstNonEmptyLine?.trim() ?? null;
}

function createNoteDocumentSchema(documentSchema: z.ZodString) {
  return documentSchema
    .min(1)
    .max(NOTE_DOCUMENT_MAX_LENGTH)
    .refine((document) => deriveNoteTitle(document) !== null, {
      message: 'The note document must contain a non-whitespace line.',
    })
    .refine(
      (document) => {
        const title = deriveNoteTitle(document);
        return title === null || title.length <= NOTE_TITLE_MAX_LENGTH;
      },
      {
        message: `The derived note title must contain at most ${NOTE_TITLE_MAX_LENGTH} characters.`,
      },
    );
}

export const noteDocumentSchema = createNoteDocumentSchema(z.string());

export const normalizedNoteDocumentSchema = createNoteDocumentSchema(
  z.string().overwrite(normalizeNoteDocument),
);
