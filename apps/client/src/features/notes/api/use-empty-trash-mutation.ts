import type { Note } from '@nestra/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';
import { noteDraftStorage } from '../drafts/note-draft-storage';
import { reconcileNoteLists } from './note-cache';
import { isNoteNotFoundError } from './note-error';
import { noteQueryKeys } from './note-query-keys';
import { emptyTrash, getNote } from './notes-api';

async function removePermanentlyDeletedDrafts(userId: string): Promise<void> {
  let draftNoteIds: readonly string[];

  try {
    draftNoteIds = await noteDraftStorage.listExistingNoteIds(userId);
  } catch (error: unknown) {
    logger.error('Existing note drafts could not be listed after emptying Trash', error);
    return;
  }

  await Promise.all(
    draftNoteIds.map(async (noteId) => {
      try {
        await getNote(noteId);
      } catch (error: unknown) {
        if (!isNoteNotFoundError(error)) {
          logger.error('A note draft could not be reconciled after emptying Trash', error, {
            noteId,
          });
          return;
        }

        try {
          await noteDraftStorage.remove(userId, { kind: 'existing', noteId });
        } catch (storageError: unknown) {
          logger.error(
            'Empty trash could not remove a permanently deleted note draft',
            storageError,
            { noteId },
          );
        }
      }
    }),
  );
}

export function useEmptyTrashMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: emptyTrash,
    onSuccess: async () => {
      queryClient.setQueryData<readonly Note[]>(noteQueryKeys.list(true), []);
      // The bulk response intentionally exposes only a count, so every cached detail must be
      // removed to avoid retaining a note trashed on another client before this request.
      queryClient.removeQueries({ queryKey: noteQueryKeys.details() });

      if (user) {
        await removePermanentlyDeletedDrafts(user.id);
      }

      await reconcileNoteLists(queryClient);
    },
  });
}
