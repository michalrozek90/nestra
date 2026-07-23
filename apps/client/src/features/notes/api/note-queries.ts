import { useQuery } from '@tanstack/react-query';

import { noteQueryKeys } from './note-query-keys';
import { getNote, listNotes } from './notes-api';

export function useNotesListQuery(isArchived: boolean) {
  return useQuery({
    queryKey: noteQueryKeys.list(isArchived),
    queryFn: () => listNotes(isArchived),
    refetchOnWindowFocus: true,
  });
}

export function useNoteQuery(noteId: string | null) {
  return useQuery({
    enabled: noteId !== null,
    queryKey: noteId ? noteQueryKeys.detail(noteId) : noteQueryKeys.detail('invalid'),
    queryFn: () => {
      if (!noteId) {
        throw new Error('A valid note ID is required.');
      }
      return getNote(noteId);
    },
    refetchOnWindowFocus: true,
  });
}
