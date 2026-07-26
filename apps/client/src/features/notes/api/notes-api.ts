import {
  createNoteSchema,
  emptyTrashResponseSchema,
  noteListSchema,
  noteSchema,
  updateNoteSchema,
  type CreateNote,
  type EmptyTrashResponse,
  type Note,
  type NoteList,
  type UpdateNote,
} from '@nestra/contracts';

import { apiClient } from '@/infrastructure/api/api-client';

export async function listNotes(isTrashed: boolean): Promise<NoteList> {
  const response = await apiClient.get<unknown>('/notes', {
    params: { trashed: isTrashed },
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

export async function deleteNotePermanently(noteId: string): Promise<void> {
  await apiClient.delete(`/notes/${noteId}`);
}

export async function emptyTrash(): Promise<EmptyTrashResponse> {
  const response = await apiClient.delete<unknown>('/notes/trash');
  return emptyTrashResponseSchema.parse(response.data);
}
