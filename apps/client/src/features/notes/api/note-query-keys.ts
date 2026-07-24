export const noteQueryKeys = {
  all: ['notes'] as const,
  lists: () => [...noteQueryKeys.all, 'list'] as const,
  list: (isArchived: boolean) => [...noteQueryKeys.lists(), { isArchived }] as const,
  details: () => [...noteQueryKeys.all, 'detail'] as const,
  detail: (noteId: string) => [...noteQueryKeys.details(), noteId] as const,
};
