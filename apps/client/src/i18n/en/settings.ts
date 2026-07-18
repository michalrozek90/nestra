export const enSettings = {
  title: 'Settings',
  sections: {
    language: 'Language',
    developer: 'Developer',
  },
  language: {
    english: 'English',
    polish: 'Polish',
    selected: 'Selected',
    saveFailed: 'The language changed, but the preference could not be saved.',
  },
  diagnostics: {
    entryTitle: 'Developer diagnostics',
    entryDescription: 'View safe runtime and connection information.',
    title: 'Developer diagnostics',
    sections: {
      application: 'Application',
      api: 'API',
      localization: 'Localization',
    },
    labels: {
      name: 'Name',
      version: 'Product version',
      environment: 'Environment',
      platform: 'Platform',
      apiBaseUrl: 'Base URL',
      lastSuccessfulRequest: 'Last successful request',
      lastFailedRequest: 'Last failed request',
      lastErrorCode: 'Last error code',
      lastRequestId: 'Last request ID',
      selectedLanguage: 'Selected language',
      detectedLanguage: 'Detected system language',
      preferenceStorage: 'Preference storage',
    },
    values: {
      available: 'Available',
      unavailable: 'Unavailable',
      notAvailable: 'Not available',
    },
  },
} as const;
