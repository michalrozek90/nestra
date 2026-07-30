export const enReleases = {
  about: {
    title: 'About',
    productName: 'Nestra',
    versionLabel: 'Version {{version}}',
    historyTitle: 'What’s new history',
    historyDescription: 'Browse curated product notes for each released version.',
    actions: {
      back: 'Back',
    },
  },
  whatsNew: {
    title: 'What’s new',
    intro: 'Here is what arrived in Nestra {{version}}.',
    dismiss: 'Got it',
  },
  categories: {
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed',
    removed: 'Removed',
  },
  versions: {
    v010: {
      title: 'First release',
      changes: {
        createNotes: 'Create and edit personal notes with automatic saving.',
        pinNotes: 'Pin important notes so they stay at the top of the list.',
        trashNotes: 'Move notes to Trash and restore them later when needed.',
        titleOnlyNotes: 'Save a note with only a title — the body is optional.',
        secureSignIn: 'Sign in securely and stay signed in between sessions.',
        appearance: 'Choose light, dark, or system appearance.',
        languages: 'Use the app in English or Polish.',
        windowsDesktop: 'Install Nestra as a Windows desktop application.',
      },
    },
  },
} as const;
