import type { Note, UpdateNote } from '@nestra/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';
import { reconcileNoteLists, removeNoteFromCache, updateNoteCache } from './note-cache';
import { noteDraftStorage } from '../drafts/note-draft-storage';
import { deleteNotePermanently, updateNote } from './notes-api';

export type NoteAction =
  | { readonly kind: 'toggle-pinned'; readonly note: Note }
  | { readonly kind: 'move-to-trash'; readonly note: Note }
  | { readonly kind: 'restore'; readonly note: Note }
  | { readonly kind: 'delete-permanently'; readonly note: Note };

type NoteUpdateAction = Exclude<NoteAction, { readonly kind: 'delete-permanently' }>;

function getNoteUpdate(action: NoteUpdateAction): UpdateNote {
  switch (action.kind) {
    case 'toggle-pinned':
      return { isPinned: !action.note.isPinned };
    case 'move-to-trash':
      return { isTrashed: true };
    case 'restore':
      return { isTrashed: false };
  }
}

export function useNoteActionMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (action: NoteAction) => {
      if (action.kind === 'delete-permanently') {
        await deleteNotePermanently(action.note.id);
        return action;
      }

      const updatedNote = await updateNote(action.note.id, getNoteUpdate(action));
      return { ...action, updatedNote };
    },
    onSuccess: async (completedAction) => {
      if (completedAction.kind === 'delete-permanently') {
        await removeNoteFromCache(queryClient, completedAction.note.id);
        if (user) {
          try {
            await noteDraftStorage.remove(user.id, {
              kind: 'existing',
              noteId: completedAction.note.id,
            });
          } catch (error: unknown) {
            logger.error('Permanently deleted note draft could not be removed', error, {
              noteId: completedAction.note.id,
            });
          }
        }
        return;
      }

      updateNoteCache(queryClient, completedAction.updatedNote);
      await reconcileNoteLists(queryClient);
    },
  });
}
