import {
  createNoteSchema,
  deriveNoteTitle,
  normalizeNoteDocument,
  NOTE_DOCUMENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  type CreateNote,
  type Note,
  type UpdateNote,
} from '@nestra/contracts';

export type NoteEditorValue = {
  readonly document: string;
};

export type NoteEditorValidationErrors = {
  document?: 'required' | 'titleTooLong' | 'tooLong';
};

export function validateNoteEditorValue(value: NoteEditorValue): NoteEditorValidationErrors {
  const normalizedDocument = normalizeNoteDocument(value.document);
  const title = deriveNoteTitle(normalizedDocument);

  if (title === null) {
    return { document: 'required' };
  }

  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return { document: 'titleTooLong' };
  }

  return normalizedDocument.length > NOTE_DOCUMENT_MAX_LENGTH ? { document: 'tooLong' } : {};
}

export function normalizeNoteEditorValue(value: NoteEditorValue): CreateNote | null {
  const parsedValue = createNoteSchema.safeParse(value);
  return parsedValue.success ? parsedValue.data : null;
}

export function getChangedNoteFields(value: CreateNote, serverNote: Note): UpdateNote | null {
  const request: UpdateNote = {
    ...(value.document !== serverNote.document ? { document: value.document } : {}),
  };

  return Object.keys(request).length > 0 ? request : null;
}
