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
  categories: {
    added: 'Dodano',
    changed: 'Zmieniono',
    fixed: 'Naprawiono',
    removed: 'Usunięto',
  },
  versions: {
    v010: {
      title: 'Pierwsze wydanie',
      changes: {
        createNotes: 'Twórz i edytuj osobiste notatki z automatycznym zapisywaniem.',
        pinNotes: 'Przypinaj ważne notatki, żeby zostawały na górze listy.',
        trashNotes: 'Przenoś notatki do Kosza i przywracaj je później, gdy ich potrzebujesz.',
        titleOnlyNotes: 'Zapisuj notatkę tylko z tytułem — treść jest opcjonalna.',
        secureSignIn: 'Loguj się bezpiecznie i pozostawaj zalogowany między sesjami.',
        appearance: 'Wybierz jasny, ciemny lub systemowy wygląd.',
        languages: 'Korzystaj z aplikacji po angielsku lub po polsku.',
        windowsDesktop: 'Zainstaluj Nestrę jako aplikację pulpitu Windows.',
      },
    },
  },
} as const;
