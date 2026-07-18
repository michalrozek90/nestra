export const plSettings = {
  title: 'Ustawienia',
  sections: {
    language: 'Język',
    developer: 'Dla dewelopera',
  },
  language: {
    english: 'Angielski',
    polish: 'Polski',
    selected: 'Wybrany',
    saveFailed: 'Język został zmieniony, ale nie udało się zapisać ustawienia.',
  },
  diagnostics: {
    entryTitle: 'Diagnostyka deweloperska',
    entryDescription: 'Zobacz bezpieczne informacje o środowisku i połączeniu.',
    title: 'Diagnostyka deweloperska',
    sections: {
      application: 'Aplikacja',
      api: 'API',
      localization: 'Lokalizacja',
    },
    labels: {
      name: 'Nazwa',
      version: 'Wersja produktu',
      environment: 'Środowisko',
      platform: 'Platforma',
      apiBaseUrl: 'Adres bazowy',
      lastSuccessfulRequest: 'Ostatnie udane żądanie',
      lastFailedRequest: 'Ostatnie nieudane żądanie',
      lastErrorCode: 'Ostatni kod błędu',
      lastRequestId: 'Identyfikator ostatniego żądania',
      selectedLanguage: 'Wybrany język',
      detectedLanguage: 'Wykryty język systemu',
      preferenceStorage: 'Pamięć ustawień',
    },
    values: {
      available: 'Dostępna',
      unavailable: 'Niedostępna',
      notAvailable: 'Brak danych',
    },
  },
} as const;
