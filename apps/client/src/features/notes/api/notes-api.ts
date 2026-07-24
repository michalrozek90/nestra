import {
  createNoteSchema,
  noteListSchema,
  noteSchema,
  updateNoteSchema,
  type CreateNote,
  type Note,
  type NoteList,
  type UpdateNote,
} from '@nestra/contracts';

import { apiClient } from '@/infrastructure/api/api-client';

export async function listNotes(isArchived: boolean): Promise<NoteList> {
  const response = await apiClient.get<unknown>('/notes', {
    params: { archived: isArchived },
  });
  return noteListSchema.parse(response.data);
}

export async function getNote(noteId: string): Promise<Note> {
  const response = await apiClient.get<unknown>(`/notes/${noteId}`);
  return noteSchema.parse(response.data);
}

export async function createNote(request: CreateNote): Promise<Note> {
  const validatedRequest = createNoteSchema.parse(request);
  const response = await apiClient.post<unknown>('/notes', validatedRequest);
  return noteSchema.parse(response.data);
}

export async function updateNote(noteId: string, request: UpdateNote): Promise<Note> {
  const validatedRequest = updateNoteSchema.parse(request);
  const response = await apiClient.patch<unknown>(`/notes/${noteId}`, validatedRequest);
  return noteSchema.parse(response.data);
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiClient.delete(`/notes/${noteId}`);
}
