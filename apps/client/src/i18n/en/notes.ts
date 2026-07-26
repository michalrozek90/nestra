export const enNotes = {
  list: {
    title: 'Your notes',
    active: 'Active',
    trash: 'Trash',
    pinned: 'Pinned',
    loading: 'Loading notes…',
    emptyActiveTitle: 'No notes yet',
    emptyActiveDescription: 'Create a note to keep something important close at hand.',
    emptyTrashTitle: 'Trash is empty',
    emptyTrashDescription:
      'Notes moved to Trash appear here, where you can restore or permanently delete them.',
  },
  editor: {
    loading: 'Loading note…',
    documentLabel: 'Note document',
    documentPlaceholder: 'Start writing…',
    documentRequired: 'Write at least one non-empty line.',
    titleLineTooLong: 'The first non-empty line can contain up to 240 characters.',
    documentTooLong: 'The note can contain up to 20,122 characters.',
    saveFailed: 'Save failed',
  },
  actions: {
    back: 'Back',
    new: 'New note',
    retry: 'Try again',
    pin: 'Pin',
    unpin: 'Unpin',
    moveToTrash: 'Move to trash',
    restore: 'Restore',
    deletePermanently: 'Delete permanently',
    emptyTrash: 'Empty trash',
    retryEmptyTrash: 'Try emptying trash again',
    cancel: 'Cancel',
    keepDraft: 'Keep draft',
    discardDraft: 'Discard draft',
  },
  permanentDelete: {
    title: 'Permanently delete note?',
    description: 'This note will be permanently deleted. This action cannot be undone.',
  },
  emptyTrash: {
    title: 'Empty trash?',
    description:
      'All notes currently in Trash will be permanently deleted and cannot be recovered.',
    success: 'Trash emptied. Permanently deleted notes: {{count}}.',
  },
  draftRecovery: {
    invalidTitle: 'Draft needs attention',
    invalidDescription:
      'The locally saved draft does not currently meet note requirements. You can keep editing it or discard it and return to the server version.',
  },
  errors: {
    notFound: 'This note no longer exists.',
    notTrashed: 'Move this note to Trash before permanently deleting it.',
    validationFailed: 'The note contains invalid values.',
    serviceUnavailable: 'The notes service is unavailable. Check your connection and try again.',
    unexpected: 'Something went wrong while working with this note.',
  },
} as const;
