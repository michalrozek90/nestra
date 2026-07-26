export const noteQueryKeys = {
  all: ['notes'] as const,
  lists: () => [...noteQueryKeys.all, 'list'] as const,
  list: (isTrashed: boolean) => [...noteQueryKeys.lists(), { isTrashed }] as const,
  details: () => [...noteQueryKeys.all, 'detail'] as const,
  detail: (noteId: string) => [...noteQueryKeys.details(), noteId] as const,
};
