export const plReleases = {
  about: {
    title: 'O aplikacji',
    productName: 'Nestra',
    versionLabel: 'Wersja {{version}}',
    creatorCredit: 'Autor: Michał Rożek',
    historyTitle: 'Historia nowości',
    historyDescription: 'Przeglądaj wybrane informacje o produkcie dla każdej wydanej wersji.',
    actions: {
      back: 'Wstecz',
    },
  },
  changeTypes: {
    new: 'Nowość',
    fix: 'Naprawiono',
  },
  whatsNew: {
    title: 'Co nowego',
    dismiss: 'Rozumiem',
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
  versions: {
    v040: {
      changes: {
        quietFirstLaunch:
          'Co nowego nie przeszkadza przy pierwszym uruchomieniu i pokazuje po aktualizacji tylko pominięte wersje.',
      },
    },
    v030: {
      changes: {
        googleAuthentication:
          'Możesz teraz logować się lub utworzyć konto Nestra przez Google na każdej obsługiwanej platformie, w tym w aplikacji Windows, nadal zachowując dostęp za pomocą hasła.',
        completeReleaseHistory:
          'Sekcja Co nowego pokazuje teraz każdą pominiętą wersję, z wyraźnie pogrupowanymi nowościami i naprawami.',
        creatorCredit: 'Ekran O aplikacji pokazuje teraz autora: Michał Rożek.',
        developerDiagnosticsHealth:
          'Diagnostyka deweloperska sprawdza teraz kondycję API przy otwarciu i odświeżeniu oraz pokazuje, czy pamięć szkiców jest dostępna.',
        serviceOutageErrors:
          'Tymczasowa niedostępność usługi wyświetla teraz czytelny komunikat o połączeniu zamiast nieoczekiwanego błędu.',
        sessionRequestIsolation:
          'Żądania z poprzedniego logowania nie są już kontynuowane po zmianie sesji.',
        signOutRefreshRace:
          'Wylogowanie teraz w pełni kończy sesję nawet wtedy, gdy odświeżanie tokenu było już w toku.',
        googleAccountLinking:
          'Połączenie konta Google kończy się teraz przed zalogowaniem do Nestry, a po wylogowaniu logowanie przez Google jest od razu ponownie dostępne.',
        androidGoogleReturn:
          'Logowanie przez Google wraca teraz bezpośrednio do Nestry na Androidzie, a w razie problemu wyświetla czytelną stronę pomocy.',
        googleFirstSignInReliability:
          'Logowanie przez Google działa teraz niezawodnie już przy pierwszej próbie po uruchomieniu usługi Nestry.',
        newNoteDraftMigration:
          'Tworzenie notatki zachowuje teraz najnowsze zmiany i nie zostawia lokalnego szkicu, który mógłby otworzyć się w nowej notatce.',
        updatePromptCoordination:
          'Monity aktualizacji na desktopie czekają, aż zamkniesz Co nowego, a sprawdzanie aktualizacji w O aplikacji działa także zaraz po zakończeniu sprawdzania w tle.',
      },
    },
    v020: {
      changes: {
        desktopUpdates: 'Nestra ma autoupdater!',
        diagnosticsBack: 'Dodano przycisk strzałki wstecz na ekranie diagnostyki deweloperskiej.',
        narrowLayout: 'Nestra działa teraz na ekranach o szerokości od 320 px.',
        centeredNavigation: 'Ikony nawigacji pozostają wizualnie wyśrodkowane na wąskich układach.',
        releaseHistory:
          'Ekran O aplikacji zawiera teraz historię wersji oraz podsumowanie „Co nowego” wyświetlane po aktualizacji.',
      },
    },
    v010: {
      changes: {
        responsiveDialogs:
          'Okna dialogowe z działaniami dopasowują się do mniejszych ekranów i nie wychodzą poza ich obszar.',
        editorFocus: 'Edytor zachowuje fokus po utworzeniu lub otwarciu notatki.',
        titleOnlyNotes: 'Notatki zawierające wyłącznie tytuł są poprawnie zachowywane.',
        patientSessionRestore:
          'Przywracanie sesji dłużej czeka i krótko ponawia próbę przy wolnym połączeniu, zamiast od razu kończyć się błędem.',
        packagedDesktopAssets:
          'Spakowana aplikacja dla Windows niezawodnie ładuje ikony i łączy się z usługą sieciową.',
      },
    },
  },
} as const;
