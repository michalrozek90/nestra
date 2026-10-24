import releaseNoteChanges from './release-note-changes.json';

export const enReleases = {
  about: {
    title: 'About',
    productName: 'Nestra',
    versionLabel: 'Version {{version}}',
    creatorCredit: 'Author: Michał Rożek',
    actions: {
      back: 'Back',
    },
  },
  changeTypes: {
    new: 'New',
    fix: 'Fix',
  },
  releaseNoteChanges,
  whatsNew: {
    title: 'What’s new',
    dismiss: 'Got it',
    viewAll: 'View all updates',
    earlier: 'Earlier',
    versionSummary: 'Version {{version}}, released {{date}}',
    actions: {
      back: 'Back',
    },
  },
  update: {
    title: 'Nestra update',
    settingsTitle: 'Application updates',
    available: 'Nestra {{version}} is ready to download and install.',
    availableWithNotes: 'Nestra {{version}} is ready to download and install.\n\n{{notes}}',
    downloading: 'Downloading the update…',
    downloadingProgress: 'Downloading the update… {{progressPercent}}%',
    downloadProgressAccessibilityLabel: 'Update download progress',
    installing: 'Installing the update. Nestra will restart when it is ready.',
    restartRequired: 'The update was installed. Restart Nestra to finish.',
    status: {
      idle: 'No update check has been completed in this session.',
      checking: 'Checking for updates…',
      upToDate: 'You are using the latest version.',
      available: 'Version {{version}} is available.',
      availableWithNotes: 'Version {{version}} is available.\n\n{{notes}}',
    },
    errors: {
      'check-failed': 'Nestra could not check for updates. Try again later.',
      'download-failed': 'The update could not be downloaded. You can try again.',
      'local-save-failed':
        'The update was paused because an open note could not be saved locally. Check the note and try again.',
      'install-failed': 'The update could not be installed. You can try again.',
      'restart-failed': 'The update was installed, but Nestra could not restart automatically.',
    },
    actions: {
      check: 'Check for updates',
      install: 'Download and install',
      later: 'Later',
      close: 'Close',
      retry: 'Try again',
      restart: 'Restart Nestra',
    },
  },
} as const;
