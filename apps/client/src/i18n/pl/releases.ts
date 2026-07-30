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
