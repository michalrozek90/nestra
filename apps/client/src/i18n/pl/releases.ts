import releaseNoteChanges from './release-note-changes.json';

export const plReleases = {
  about: {
    title: 'O aplikacji',
    productName: 'Nestra',
    versionLabel: 'Wersja {{version}}',
    creatorCredit: 'Autor: Michał Rożek',
    actions: {
      back: 'Wstecz',
    },
  },
  changeTypes: {
    new: 'Nowość',
    fix: 'Naprawiono',
  },
  releaseNoteChanges,
  whatsNew: {
    title: 'Co nowego',
    dismiss: 'Rozumiem',
    viewAll: 'Zobacz wszystkie aktualizacje',
    earlier: 'Wcześniejsze wersje',
    versionSummary: 'Wersja {{version}}, wydana {{date}}',
    actions: {
      back: 'Wstecz',
    },
  },
  update: {
    title: 'Aktualizacja Nestry',
    settingsTitle: 'Aktualizacje aplikacji',
    available: 'Nestra {{version}} jest gotowa do pobrania i instalacji.',
    availableWithNotes: 'Nestra {{version}} jest gotowa do pobrania i instalacji.\n\n{{notes}}',
    downloading: 'Pobieranie aktualizacji…',
    downloadingProgress: 'Pobieranie aktualizacji… {{progressPercent}}%',
    downloadProgressAccessibilityLabel: 'Postęp pobierania aktualizacji',
    installing: 'Instalowanie aktualizacji. Nestra uruchomi się ponownie, gdy będzie gotowa.',
    restartRequired: 'Aktualizacja została zainstalowana. Uruchom Nestrę ponownie, aby zakończyć.',
    status: {
      idle: 'W tej sesji nie sprawdzono jeszcze aktualizacji.',
      checking: 'Sprawdzanie aktualizacji…',
      upToDate: 'Korzystasz z najnowszej wersji.',
      available: 'Dostępna jest wersja {{version}}.',
      availableWithNotes: 'Dostępna jest wersja {{version}}.\n\n{{notes}}',
    },
    errors: {
      'check-failed': 'Nie udało się sprawdzić aktualizacji. Spróbuj ponownie później.',
      'download-failed': 'Nie udało się pobrać aktualizacji. Możesz spróbować ponownie.',
      'local-save-failed':
        'Aktualizacja została wstrzymana, ponieważ nie udało się lokalnie zapisać otwartej notatki. Sprawdź notatkę i spróbuj ponownie.',
      'install-failed': 'Nie udało się zainstalować aktualizacji. Możesz spróbować ponownie.',
      'restart-failed':
        'Aktualizacja została zainstalowana, ale nie udało się automatycznie uruchomić Nestry ponownie.',
    },
    actions: {
      check: 'Sprawdź aktualizacje',
      install: 'Pobierz i zainstaluj',
      later: 'Później',
      close: 'Zamknij',
      retry: 'Spróbuj ponownie',
      restart: 'Uruchom Nestrę ponownie',
    },
  },
} as const;
