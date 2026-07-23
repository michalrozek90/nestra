import type { Note } from '@nestra/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reconcileNoteLists, removeNoteFromCache, updateNoteCache } from './note-cache';
import { deleteNote, updateNote } from './notes-api';

export type NoteAction =
  | { readonly kind: 'toggle-pinned'; readonly note: Note }
  | { readonly kind: 'toggle-archived'; readonly note: Note }
  | { readonly kind: 'delete'; readonly note: Note };

export function useNoteActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: NoteAction) => {
      if (action.kind === 'delete') {
        await deleteNote(action.note.id);
        return action;
      }

      const updatedNote = await updateNote(
        action.note.id,
        action.kind === 'toggle-pinned'
          ? { isPinned: !action.note.isPinned }
          : { isArchived: !action.note.isArchived },
      );
      return { ...action, updatedNote };
    },
    onSuccess: async (completedAction) => {
      if (completedAction.kind === 'delete') {
        await removeNoteFromCache(queryClient, completedAction.note.id);
        return;
      }

      updateNoteCache(queryClient, completedAction.updatedNote);
      await reconcileNoteLists(queryClient);
    },
  });
}
