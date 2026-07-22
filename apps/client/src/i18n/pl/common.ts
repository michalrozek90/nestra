export const plCommon = {
  navigation: {
    notes: 'Notatki',
    shopping: 'Zakupy',
    reminders: 'Przypomnienia',
    relax: 'Relaks',
    settings: 'Ustawienia',
  },
  actions: {
    retry: 'Spróbuj ponownie',
    clearLocalSession: 'Wyczyść lokalną sesję',
  },
  initialization: {
    loading: 'Przygotowywanie Nestry…',
    failed: 'Nie udało się uruchomić Nestry.',
    retry: 'Spróbuj ponownie',
    sessionUnavailable:
      'Nie udało się odtworzyć zapisanej sesji. Sprawdź połączenie i spróbuj ponownie.',
  },
  placeholders: {
    futureVersion: 'Funkcja pojawi się w przyszłej wersji.',
  },
} as const;
