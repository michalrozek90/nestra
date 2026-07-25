import type { Note } from '@nestra/contracts';
import { useEffect, useRef, useState } from 'react';

import { useNoteEditor } from './use-note-editor';

type NoteEditorField = 'title' | 'content';

type NoteEditorSelection = {
  readonly start: number;
  readonly end: number;
};

type NoteEditorFocusTransfer = {
  readonly noteId: string;
  readonly field: NoteEditorField;
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
  const focusedFieldRef = useRef<NoteEditorField | null>(null);
  const titleSelectionRef = useRef<NoteEditorSelection>({
    start: initialNote?.title.length ?? 0,
    end: initialNote?.title.length ?? 0,
  });
  const contentSelectionRef = useRef<NoteEditorSelection>({
    start: initialNote?.content.length ?? 0,
    end: initialNote?.content.length ?? 0,
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
      const focusedField = focusedFieldRef.current;
      if (focusedField) {
        queueNoteEditorFocusTransfer({
          noteId,
          field: focusedField,
          selection:
            focusedField === 'title' ? titleSelectionRef.current : contentSelectionRef.current,
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

  function getFocusBinding(
    field: NoteEditorField,
    selectionRef: { current: NoteEditorSelection },
    textLength: number,
  ): NoteEditorFocusBinding {
    const selection =
      !isFocusRestorationComplete && focusTransfer?.field === field
        ? {
            start: Math.min(focusTransfer.selection.start, textLength),
            end: Math.min(focusTransfer.selection.end, textLength),
          }
        : undefined;

    return {
      autoFocus: selection !== undefined,
      onBlur: () => {
        if (focusedFieldRef.current === field) {
          focusedFieldRef.current = null;
        }
      },
      onFocus: () => {
        focusedFieldRef.current = field;
      },
      onSelectionChange: (nextSelection) => {
        selectionRef.current = nextSelection;
      },
      selection,
    };
  }

  return {
    contentFocus: getFocusBinding('content', contentSelectionRef, editor.value.content.length),
    editor,
    titleFocus: getFocusBinding('title', titleSelectionRef, editor.value.title.length),
  };
}
