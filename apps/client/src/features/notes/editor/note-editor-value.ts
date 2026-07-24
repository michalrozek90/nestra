import { createNoteSchema, type CreateNote, type Note, type UpdateNote } from '@nestra/contracts';

export type NoteEditorValue = {
  readonly title: string;
  readonly content: string;
};

export type NoteEditorValidationErrors = {
  title?: 'required' | 'tooLong';
  content?: 'tooLong';
};

export function validateNoteEditorValue(value: NoteEditorValue): NoteEditorValidationErrors {
  const parsedValue = createNoteSchema.safeParse(value);
  if (parsedValue.success) {
    return {};
  }

  const errors: NoteEditorValidationErrors = {};
  for (const issue of parsedValue.error.issues) {
    const field = issue.path[0];
    if (field === 'title') {
      errors.title = value.title.trim().length === 0 ? 'required' : 'tooLong';
    } else if (field === 'content') {
      errors.content = 'tooLong';
    }
  }
  return errors;
}

export function normalizeNoteEditorValue(value: NoteEditorValue): CreateNote | null {
  const parsedValue = createNoteSchema.safeParse(value);
  return parsedValue.success ? parsedValue.data : null;
}

export function getChangedNoteFields(value: CreateNote, serverNote: Note): UpdateNote | null {
  const request: UpdateNote = {
    ...(value.title !== serverNote.title ? { title: value.title } : {}),
    ...(value.content !== serverNote.content ? { content: value.content } : {}),
  };

  return Object.keys(request).length > 0 ? request : null;
}
