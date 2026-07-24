import type { Note } from '@nestra/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { noteQueryKeys } from './note-query-keys';

function sortNotes(left: Note, right: Note): number {
  if (left.isPinned !== right.isPinned) {
    return left.isPinned ? -1 : 1;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

export function updateNoteCache(queryClient: QueryClient, note: Note): void {
  queryClient.setQueryData(noteQueryKeys.detail(note.id), note);
  queryClient.setQueryData<readonly Note[]>(noteQueryKeys.list(note.isArchived), (notes) => {
    if (!notes) {
      return notes;
    }

    const remainingNotes = notes.filter(({ id }) => id !== note.id);
    return [note, ...remainingNotes].sort(sortNotes);
  });
  queryClient.setQueryData<readonly Note[]>(noteQueryKeys.list(!note.isArchived), (notes) =>
    notes?.filter(({ id }) => id !== note.id),
  );
}

export async function reconcileNoteLists(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: noteQueryKeys.lists() });
}

export async function removeNoteFromCache(queryClient: QueryClient, noteId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: noteQueryKeys.detail(noteId) });
  queryClient.setQueriesData<readonly Note[]>({ queryKey: noteQueryKeys.lists() }, (notes) =>
    notes?.filter(({ id }) => id !== noteId),
  );
  await reconcileNoteLists(queryClient);
}
