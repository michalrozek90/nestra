export type NoteEditorField = 'title' | 'content';

export type NoteEditorSelection = {
  readonly start: number;
  readonly end: number;
};

export type NoteEditorFocusTransfer = {
  readonly noteId: string;
  readonly field: NoteEditorField;
  readonly selection: NoteEditorSelection;
};

const FOCUS_TRANSFER_EXPIRATION_MS = 5_000;

type PendingNoteEditorFocusTransfer = NoteEditorFocusTransfer & {
  readonly expiresAtMs: number;
};

let pendingFocusTransfer: PendingNoteEditorFocusTransfer | null = null;

export function queueNoteEditorFocusTransfer(transfer: NoteEditorFocusTransfer): void {
  pendingFocusTransfer = {
    ...transfer,
    expiresAtMs: Date.now() + FOCUS_TRANSFER_EXPIRATION_MS,
  };
}

export function readNoteEditorFocusTransfer(noteId: string): NoteEditorFocusTransfer | null {
  if (!pendingFocusTransfer) {
    return null;
  }

  if (pendingFocusTransfer.expiresAtMs < Date.now()) {
    pendingFocusTransfer = null;
    return null;
  }

  return pendingFocusTransfer.noteId === noteId ? pendingFocusTransfer : null;
}

export function consumeNoteEditorFocusTransfer(noteId: string): void {
  if (pendingFocusTransfer?.noteId === noteId) {
    pendingFocusTransfer = null;
  }
}
