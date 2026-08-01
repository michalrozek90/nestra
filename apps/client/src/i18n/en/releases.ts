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
  changeTypes: {
    new: 'New',
    fix: 'Fix',
  },
  whatsNew: {
    title: 'What’s new',
    intro: 'Here is everything you have missed up to Nestra {{version}}.',
    dismiss: 'Got it',
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
  versions: {
    v030: {
      changes: {
        completeReleaseHistory:
          'What’s new now shows every version you missed, with new features and fixes clearly grouped.',
      },
    },
    v020: {
      changes: {
        desktopUpdates:
          'Nestra can check for signed Windows updates and install a new version from the application.',
        safeUpdateRestart:
          'Open notes are saved locally before an update is installed and Nestra restarts.',
        quietAutomaticChecks:
          'An unavailable update service no longer shows an error during the automatic startup check.',
        diagnosticsBack:
          'A back arrow on the developer diagnostics screen lets you return to Settings.',
        narrowLayout:
          'The layout and note header actions work better on very narrow screens, starting at 320 px wide.',
        centeredNavigation: 'Navigation icons stay visually centered on compact layouts.',
        releaseHistory:
          'The About screen now includes a curated version history, with a What\u2019s new summary after an update.',
      },
    },
    v010: {
      changes: {
        responsiveDialogs: 'Action dialogs adapt to smaller screens instead of overflowing them.',
        editorFocus: 'The note editor keeps focus after creating or opening a note.',
        titleOnlyNotes: 'Notes containing only a title are preserved correctly.',
        patientSessionRestore:
          'Restoring your session waits longer and retries briefly when the connection is slow, instead of failing right away.',
        packagedDesktopAssets:
          'The packaged Windows application reliably loads its icons and connects to the hosted service.',
      },
    },
  },
} as const;
