import type { Note } from '@nestra/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';
import { noteDraftStorage } from '../drafts/note-draft-storage';
import { reconcileNoteLists } from './note-cache';
import { noteQueryKeys } from './note-query-keys';
import { emptyTrash } from './notes-api';

export function useEmptyTrashMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const listedNotes = queryClient.getQueryData<readonly Note[]>(noteQueryKeys.list(true)) ?? [];
      const cachedDetails = queryClient
        .getQueriesData<Note>({ queryKey: noteQueryKeys.details() })
        .flatMap(([, note]) => (note?.isTrashed ? [note] : []));
      const deletedNoteIds = [
        ...new Set([...listedNotes, ...cachedDetails].map((note) => note.id)),
      ];
      const response = await emptyTrash();

      return { ...response, deletedNoteIds };
    },
    onSuccess: async ({ deletedNoteIds }) => {
      queryClient.setQueryData<readonly Note[]>(noteQueryKeys.list(true), []);
      for (const noteId of deletedNoteIds) {
        queryClient.removeQueries({ queryKey: noteQueryKeys.detail(noteId) });
      }

      if (user) {
        await Promise.all(
          deletedNoteIds.map(async (noteId) => {
            try {
              await noteDraftStorage.remove(user.id, { kind: 'existing', noteId });
            } catch (error: unknown) {
              logger.error('Empty trash could not remove a permanently deleted note draft', error, {
                noteId,
              });
            }
          }),
        );
      }

      await reconcileNoteLists(queryClient);
    },
  });
}
