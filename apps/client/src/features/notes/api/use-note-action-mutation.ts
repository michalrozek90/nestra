import type { Note } from '@nestra/contracts';
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

export function useNoteActionMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (action: NoteAction) => {
      if (action.kind === 'delete-permanently') {
        await deleteNotePermanently(action.note.id);
        return action;
      }

      const updatedNote = await updateNote(
        action.note.id,
        action.kind === 'toggle-pinned'
          ? { isPinned: !action.note.isPinned }
          : { isTrashed: action.kind === 'move-to-trash' },
      );
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
