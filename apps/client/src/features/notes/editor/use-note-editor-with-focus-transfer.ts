import type { Note } from '@nestra/contracts';
import { useEffect, useRef, useState } from 'react';

import { useNoteEditor } from './use-note-editor';

type NoteEditorSelection = {
  readonly start: number;
  readonly end: number;
};

type NoteEditorFocusTransfer = {
  readonly noteId: string;
  readonly selection: NoteEditorSelection;
};

type PendingNoteEditorFocusTransfer = NoteEditorFocusTransfer & {
  readonly expiresAtMs: number;
};

type NoteEditorFocusBinding = {
  readonly autoFocus: boolean;
  readonly onBlur: () => void;
  readonly onFocus: () => void;
  readonly onSelectionChange: (selection: NoteEditorSelection) => void;
  readonly selection: NoteEditorSelection | undefined;
};

type UseNoteEditorWithFocusTransferOptions = {
  readonly initialNote: Note | null;
  readonly mode: 'new' | 'existing';
  readonly onCreated: (noteId: string) => void;
  readonly userId: string;
};

const FOCUS_TRANSFER_EXPIRATION_MS = 5_000;

let pendingFocusTransfer: PendingNoteEditorFocusTransfer | null = null;

function queueNoteEditorFocusTransfer(transfer: NoteEditorFocusTransfer): void {
  pendingFocusTransfer = {
    ...transfer,
    expiresAtMs: Date.now() + FOCUS_TRANSFER_EXPIRATION_MS,
  };
}

function readNoteEditorFocusTransfer(noteId: string): NoteEditorFocusTransfer | null {
  if (!pendingFocusTransfer) {
    return null;
  }

  if (pendingFocusTransfer.expiresAtMs < Date.now()) {
    pendingFocusTransfer = null;
    return null;
  }

  return pendingFocusTransfer.noteId === noteId ? pendingFocusTransfer : null;
}

function consumeNoteEditorFocusTransfer(noteId: string): void {
  if (pendingFocusTransfer?.noteId === noteId) {
    pendingFocusTransfer = null;
  }
}

export function useNoteEditorWithFocusTransfer({
  initialNote,
  mode,
  onCreated,
  userId,
}: UseNoteEditorWithFocusTransferOptions) {
  const isDocumentFocusedRef = useRef(false);
  const documentSelectionRef = useRef<NoteEditorSelection>({
    start: initialNote?.document.length ?? 0,
    end: initialNote?.document.length ?? 0,
  });
  const [focusTransfer] = useState(() =>
    mode === 'existing' && initialNote ? readNoteEditorFocusTransfer(initialNote.id) : null,
  );
  const [isFocusRestorationComplete, setIsFocusRestorationComplete] = useState(
    focusTransfer === null,
  );
  const editor = useNoteEditor({
    userId,
    initialNote,
    onCreated: (noteId) => {
      if (isDocumentFocusedRef.current) {
        queueNoteEditorFocusTransfer({
          noteId,
          selection: documentSelectionRef.current,
        });
      }

      onCreated(noteId);
    },
  });

  useEffect(() => {
    if (focusTransfer) {
      consumeNoteEditorFocusTransfer(focusTransfer.noteId);
    }
  }, [focusTransfer]);

  useEffect(() => {
    if (!editor.isInitialized || !focusTransfer || isFocusRestorationComplete) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      setIsFocusRestorationComplete(true);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [editor.isInitialized, focusTransfer, isFocusRestorationComplete]);

  const documentLength = editor.value.document.length;
  const selection = !isFocusRestorationComplete
    ? {
        start: Math.min(focusTransfer?.selection.start ?? 0, documentLength),
        end: Math.min(focusTransfer?.selection.end ?? 0, documentLength),
      }
    : undefined;
  const documentFocus: NoteEditorFocusBinding = {
    autoFocus: focusTransfer !== null && selection !== undefined,
    onBlur: () => {
      isDocumentFocusedRef.current = false;
    },
    onFocus: () => {
      isDocumentFocusedRef.current = true;
    },
    onSelectionChange: (nextSelection) => {
      documentSelectionRef.current = nextSelection;
    },
    selection: focusTransfer ? selection : undefined,
  };

  return {
    documentFocus,
    editor,
  };
}
