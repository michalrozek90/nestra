export const plReleases = {
  about: {
    title: 'O aplikacji',
    productName: 'Nestra',
    versionLabel: 'Wersja {{version}}',
    historyTitle: 'Historia nowości',
    historyDescription: 'Przeglądaj wybrane informacje o produkcie dla każdej wydanej wersji.',
    actions: {
      back: 'Wstecz',
    },
  },
  whatsNew: {
    title: 'Co nowego',
    intro: 'Oto co pojawiło się w Nestrze {{version}}.',
    dismiss: 'Rozumiem',
  },
  update: {
    title: 'Aktualizacja Nestry',
    settingsTitle: 'Aktualizacje aplikacji',
    available: 'Nestra {{version}} jest gotowa do pobrania i instalacji.',
    availableWithNotes: 'Nestra {{version}} jest gotowa do pobrania i instalacji.\n\n{{notes}}',
    downloading: 'Pobieranie aktualizacji…',
    downloadingProgress: 'Pobieranie aktualizacji… {{progressPercent}}%',
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
  versions: {
    v010: {
      title: 'Ostatnie usprawnienia',
      changes: {
        diagnosticsBack:
          'Strzałka wstecz na ekranie diagnostyki deweloperskiej pozwala wrócić do Ustawień.',
        narrowLayout: 'Układ lepiej działa na bardzo wąskich ekranach, od szerokości 320 px.',
        centeredNavigation: 'Ikony nawigacji pozostają wizualnie wyśrodkowane na wąskich układach.',
        patientSessionRestore:
          'Przywracanie sesji dłużej czeka i krótko ponawia próbę przy wolnym połączeniu, zamiast od razu kończyć się błędem.',
      },
    },
  },
} as const;
