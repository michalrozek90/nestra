export const plNotes = {
  list: {
    title: 'Twoje notatki',
    active: 'Aktywne',
    trash: 'Kosz',
    pinned: 'Przypięta',
    loading: 'Wczytywanie notatek…',
    emptyActiveTitle: 'Nie masz jeszcze notatek',
    emptyActiveDescription: 'Utwórz notatkę, aby zachować coś ważnego pod ręką.',
    emptyTrashTitle: 'Kosz jest pusty',
    emptyTrashDescription:
      'Notatki przeniesione do Kosza pojawią się tutaj. Możesz je przywrócić lub trwale usunąć.',
  },
  editor: {
    loading: 'Wczytywanie notatki…',
    documentLabel: 'Dokument notatki',
    documentPlaceholder: 'Zacznij pisać…',
    documentRequired: 'Wpisz co najmniej jeden niepusty wiersz.',
    titleLineTooLong: 'Pierwszy niepusty wiersz może mieć maksymalnie 240 znaków.',
    documentTooLong: 'Notatka może mieć maksymalnie 20 122 znaki.',
    saving: 'Zapisywanie…',
    saved: 'Zapisano',
    saveFailed: 'Zapis nie powiódł się',
    savedLocally: 'Zapisano lokalnie',
  },
  actions: {
    back: 'Wstecz',
    new: 'Nowa notatka',
    retry: 'Spróbuj ponownie',
    pin: 'Przypnij',
    unpin: 'Odepnij',
    moveToTrash: 'Przenieś do kosza',
    restore: 'Przywróć',
    deletePermanently: 'Usuń trwale',
    emptyTrash: 'Opróżnij kosz',
    retryEmptyTrash: 'Spróbuj ponownie opróżnić kosz',
    cancel: 'Anuluj',
    keepDraft: 'Zachowaj szkic',
    discardDraft: 'Odrzuć szkic',
  },
  permanentDelete: {
    title: 'Trwale usunąć notatkę?',
    description: 'Notatka zostanie trwale usunięta. Tej operacji nie można cofnąć.',
  },
  emptyTrash: {
    title: 'Opróżnić kosz?',
    description:
      'Wszystkie notatki znajdujące się obecnie w Koszu zostaną trwale usunięte i nie będzie można ich odzyskać.',
    success: 'Kosz opróżniony. Trwale usunięte notatki: {{count}}.',
  },
  draftRecovery: {
    invalidTitle: 'Szkic wymaga uwagi',
    invalidDescription:
      'Lokalny szkic nie spełnia obecnie wymagań notatki. Możesz zachować go i kontynuować edycję albo odrzucić i wrócić do wersji z serwera.',
  },
  errors: {
    notFound: 'Ta notatka już nie istnieje.',
    notTrashed: 'Przenieś notatkę do Kosza przed jej trwałym usunięciem.',
    validationFailed: 'Notatka zawiera nieprawidłowe wartości.',
    serviceUnavailable: 'Usługa notatek jest niedostępna. Sprawdź połączenie i spróbuj ponownie.',
    unexpected: 'Podczas pracy z notatką wystąpił nieoczekiwany błąd.',
  },
} as const;
