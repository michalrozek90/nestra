import type { Note } from '@nestra/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { logger } from '@/infrastructure/logging/logger';
import { reconcileNoteLists, updateNoteCache } from '../api/note-cache';
import { createNote, updateNote } from '../api/notes-api';
import {
  noteDraftStorage,
  type NoteDraft,
  type NoteDraftIdentity,
} from '../drafts/note-draft-storage';
import {
  getChangedNoteFields,
  normalizeNoteEditorValue,
  type NoteEditorValue,
} from './note-editor-value';

const LOCAL_DRAFT_DEBOUNCE_MS = 150;
const SERVER_SAVE_DEBOUNCE_MS = 800;

export type NoteSaveStatus = 'saving' | 'saved' | 'save-failed' | 'saved-locally';

type UseNoteEditorOptions = {
  readonly userId: string;
  readonly initialNote: Note | null;
  readonly onCreated: (noteId: string) => void;
};

type UseNoteEditorResult = {
  readonly value: NoteEditorValue;
  readonly isInitialized: boolean;
  readonly saveStatus: NoteSaveStatus;
  readonly invalidRecoveredDraft: NoteDraft | null;
  readonly setTitle: (title: string) => void;
  readonly setContent: (content: string) => void;
  readonly keepInvalidRecoveredDraft: () => void;
  readonly discardInvalidRecoveredDraft: () => void;
  readonly flush: () => Promise<void>;
  readonly discard: () => Promise<void>;
};

function getIdentity(note: Note | null): NoteDraftIdentity {
  return note ? { kind: 'existing', noteId: note.id } : { kind: 'new' };
}

function toEditorValue(draft: NoteDraft): NoteEditorValue {
  return { title: draft.title, content: draft.content };
}

export function useNoteEditor({
  userId,
  initialNote,
  onCreated,
}: UseNoteEditorOptions): UseNoteEditorResult {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<NoteEditorValue>({
    title: initialNote?.title ?? '',
    content: initialNote?.content ?? '',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>(
    initialNote ? 'saved' : 'saved-locally',
  );
  const [invalidRecoveredDraft, setInvalidRecoveredDraft] = useState<NoteDraft | null>(null);
  const valueRef = useRef(value);
  const identityRef = useRef<NoteDraftIdentity>(getIdentity(initialNote));
  const serverNoteRef = useRef<Note | null>(initialNote);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const draftQueueRef = useRef<Promise<void>>(Promise.resolve());
  const creationPromiseRef = useRef<Promise<void> | null>(null);
  const editRevisionRef = useRef(0);
  const hasUnsavedChangesRef = useRef(false);
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  const onCreatedRef = useRef(onCreated);

  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);

  const writeCurrentDraft = useCallback(async (): Promise<boolean> => {
    const currentValue = valueRef.current;
    const currentIdentity = identityRef.current;
    const draft: NoteDraft = {
      title: currentValue.title,
      content: currentValue.content,
      updatedAt: new Date().toISOString(),
      ...(serverNoteRef.current ? { serverUpdatedAt: serverNoteRef.current.updatedAt } : {}),
    };

    try {
      const writeOperation = draftQueueRef.current
        .catch(() => undefined)
        .then(() => noteDraftStorage.write(userId, currentIdentity, draft));
      draftQueueRef.current = writeOperation.catch(() => undefined);
      await writeOperation;
      return true;
    } catch (error: unknown) {
      logger.error('Note draft could not be saved', error);
      if (isMountedRef.current) {
        setSaveStatus('save-failed');
      }
      return false;
    }
  }, [userId]);

  const saveExistingNote = useCallback(
    async (
      revision: number,
      normalizedValue: NonNullable<ReturnType<typeof normalizeNoteEditorValue>>,
    ) => {
      const currentServerNote = serverNoteRef.current;
      if (!currentServerNote) {
        return;
      }

      const request = getChangedNoteFields(normalizedValue, currentServerNote);
      if (!request) {
        hasUnsavedChangesRef.current = false;
        if (revision === editRevisionRef.current && isMountedRef.current) {
          setSaveStatus('saved');
        }
        try {
          await draftQueueRef.current;
          await noteDraftStorage.remove(userId, identityRef.current);
        } catch (error: unknown) {
          logger.error('Synchronized note draft could not be removed', error);
        }
        return;
      }

      try {
        const updatedNote = await updateNote(currentServerNote.id, request);
        serverNoteRef.current = updatedNote;
        updateNoteCache(queryClient, updatedNote);
        await reconcileNoteLists(queryClient);

        if (revision === editRevisionRef.current) {
          hasUnsavedChangesRef.current = false;
          try {
            await draftQueueRef.current;
            await noteDraftStorage.remove(userId, identityRef.current);
          } catch (error: unknown) {
            logger.error('Synchronized note draft could not be removed', error);
          }
          if (isMountedRef.current) {
            setSaveStatus('saved');
          }
        }
      } catch (error: unknown) {
        logger.error('Note autosave request failed', error, { noteId: currentServerNote.id });
        if (isMountedRef.current) {
          setSaveStatus('save-failed');
        }
      }
    },
    [queryClient, userId],
  );

  const createInitialNote = useCallback(
    (
      revision: number,
      normalizedValue: NonNullable<ReturnType<typeof normalizeNoteEditorValue>>,
    ) => {
      creationPromiseRef.current ??= (async () => {
        let createdNote: Note;
        try {
          createdNote = await createNote(normalizedValue);
        } catch (error: unknown) {
          logger.error('Initial note autosave request failed', error);
          if (isMountedRef.current) {
            setSaveStatus('save-failed');
          }
          return;
        }

        serverNoteRef.current = createdNote;
        updateNoteCache(queryClient, createdNote);
        try {
          await reconcileNoteLists(queryClient);
        } catch (error: unknown) {
          logger.error('Note lists could not be refreshed after note creation', error, {
            noteId: createdNote.id,
          });
        }

        try {
          await writeCurrentDraft();
          const previousIdentity = identityRef.current;
          const nextIdentity: NoteDraftIdentity = {
            kind: 'existing',
            noteId: createdNote.id,
          };
          identityRef.current = nextIdentity;
          const moveOperation = draftQueueRef.current
            .catch(() => undefined)
            .then(() => noteDraftStorage.move(userId, previousIdentity, nextIdentity));
          draftQueueRef.current = moveOperation.catch(() => undefined);
          await moveOperation;

          if (revision === editRevisionRef.current) {
            hasUnsavedChangesRef.current = false;
            await noteDraftStorage.remove(userId, nextIdentity);
            if (isMountedRef.current) {
              setSaveStatus('saved');
            }
          }
        } catch (error: unknown) {
          logger.error('New note draft could not be migrated', error, {
            noteId: createdNote.id,
          });
          await writeCurrentDraft();
          if (isMountedRef.current) {
            setSaveStatus('saved-locally');
          }
        }

        if (isMountedRef.current) {
          onCreatedRef.current(createdNote.id);
        }
      })().finally(() => {
        creationPromiseRef.current = null;
      });

      return creationPromiseRef.current;
    },
    [queryClient, userId, writeCurrentDraft],
  );

  const flushServerSave = useCallback(async (): Promise<void> => {
    if (!isInitializedRef.current) {
      return;
    }

    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }

    const normalizedValue = normalizeNoteEditorValue(valueRef.current);
    if (!normalizedValue) {
      if (isMountedRef.current) {
        setSaveStatus('saved-locally');
      }
      return;
    }

    const revision = editRevisionRef.current;
    if (isMountedRef.current) {
      setSaveStatus('saving');
    }

    if (!serverNoteRef.current) {
      await createInitialNote(revision, normalizedValue);
      return;
    }

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveExistingNote(revision, normalizedValue));
    await saveQueueRef.current;
  }, [createInitialNote, saveExistingNote]);

  const flush = useCallback(async (): Promise<void> => {
    if (!hasUnsavedChangesRef.current) {
      return;
    }

    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }
    await writeCurrentDraft();
    await flushServerSave();
  }, [flushServerSave, writeCurrentDraft]);

  const discard = useCallback(async (): Promise<void> => {
    hasUnsavedChangesRef.current = false;
    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }
    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }
    try {
      await draftQueueRef.current;
      await noteDraftStorage.remove(userId, identityRef.current);
    } catch (error: unknown) {
      logger.error('Note draft could not be discarded', error);
    }
  }, [userId]);

  const scheduleSaves = useCallback(() => {
    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
    }
    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
    }

    localTimerRef.current = setTimeout(() => {
      void writeCurrentDraft().then((wasSaved) => {
        if (wasSaved && isMountedRef.current && hasUnsavedChangesRef.current) {
          setSaveStatus('saved-locally');
        }
      });
    }, LOCAL_DRAFT_DEBOUNCE_MS);

    serverTimerRef.current = setTimeout(() => {
      void flushServerSave();
    }, SERVER_SAVE_DEBOUNCE_MS);
  }, [flushServerSave, writeCurrentDraft]);

  const updateValue = useCallback(
    (nextValue: NoteEditorValue) => {
      valueRef.current = nextValue;
      editRevisionRef.current += 1;
      hasUnsavedChangesRef.current = true;
      setValue(nextValue);
      scheduleSaves();
    },
    [scheduleSaves],
  );

  useEffect(() => {
    isMountedRef.current = true;
    const identity = getIdentity(initialNote);
    identityRef.current = identity;
    serverNoteRef.current = initialNote;
    let isCancelled = false;

    void noteDraftStorage
      .read(userId, identity)
      .then((draft) => {
        if (isCancelled) {
          return;
        }

        const shouldRecover =
          draft !== null &&
          (initialNote === null ||
            draft.serverUpdatedAt === initialNote.updatedAt ||
            Date.parse(draft.updatedAt) > Date.parse(initialNote.updatedAt));

        if (shouldRecover) {
          if (normalizeNoteEditorValue(toEditorValue(draft)) === null) {
            setInvalidRecoveredDraft(draft);
          } else {
            const recoveredValue = toEditorValue(draft);
            valueRef.current = recoveredValue;
            hasUnsavedChangesRef.current = true;
            setValue(recoveredValue);
            setSaveStatus('saved-locally');
            scheduleSaves();
          }
        }
      })
      .catch((error: unknown) => {
        logger.error('Note draft could not be read', error);
        if (!isCancelled) {
          setSaveStatus('save-failed');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          isInitializedRef.current = true;
          setIsInitialized(true);
        }
      });

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      if (localTimerRef.current) {
        clearTimeout(localTimerRef.current);
      }
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
      }
      if (hasUnsavedChangesRef.current) {
        void writeCurrentDraft();
        void flushServerSave();
      }
    };
  }, [initialNote?.id, scheduleSaves, userId, writeCurrentDraft, flushServerSave]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        void flush();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [flush]);

  const keepInvalidRecoveredDraft = useCallback(() => {
    if (!invalidRecoveredDraft) {
      return;
    }

    const recoveredValue = toEditorValue(invalidRecoveredDraft);
    valueRef.current = recoveredValue;
    hasUnsavedChangesRef.current = true;
    setValue(recoveredValue);
    setInvalidRecoveredDraft(null);
    setSaveStatus('saved-locally');
    scheduleSaves();
  }, [invalidRecoveredDraft, scheduleSaves]);

  const discardInvalidRecoveredDraft = useCallback(() => {
    setInvalidRecoveredDraft(null);
    const serverValue: NoteEditorValue = {
      title: initialNote?.title ?? '',
      content: initialNote?.content ?? '',
    };
    valueRef.current = serverValue;
    hasUnsavedChangesRef.current = false;
    setValue(serverValue);
    void noteDraftStorage.remove(userId, identityRef.current).catch((error: unknown) => {
      logger.error('Discarded note draft could not be removed', error);
    });
    setSaveStatus(initialNote ? 'saved' : 'saved-locally');
  }, [initialNote, userId]);

  return {
    value,
    isInitialized,
    saveStatus,
    invalidRecoveredDraft,
    setTitle: (title) => updateValue({ ...valueRef.current, title }),
    setContent: (content) => updateValue({ ...valueRef.current, content }),
    keepInvalidRecoveredDraft,
    discardInvalidRecoveredDraft,
    flush,
    discard,
  };
}
