export const enReleases = {
  about: {
    title: 'About',
    productName: 'Nestra',
    versionLabel: 'Version {{version}}',
    creatorCredit: 'Author: Michał Rożek',
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
    v040: {
      changes: {
        quietFirstLaunch:
          'What’s New stays quiet on your first launch and shows only the updates you missed after an upgrade.',
        slowStartupAuthentication:
          'Nestra now waits for authentication to become ready during a slow start instead of retrying early or dropping your session.',
        stableNotesActions:
          'The New note action now stays in place when you switch between active notes and Trash.',
      },
    },
    v030: {
      changes: {
        googleAuthentication:
          'You can now sign in or create your Nestra account with Google on every supported platform, including the Windows desktop app, while keeping password access available.',
        completeReleaseHistory:
          'What’s new now shows every version you missed, with new features and fixes clearly grouped.',
        creatorCredit: 'The About screen now shows the author: Michał Rożek.',
        developerDiagnosticsHealth:
          'Developer diagnostics now checks API health on open and refresh, and reports whether draft storage is available.',
        serviceOutageErrors:
          'Temporary service outages now show a clear connection message instead of an unexpected error.',
        sessionRequestIsolation:
          'Requests from a previous sign-in can no longer continue after you switch sessions.',
        signOutRefreshRace:
          'Signing out now fully ends your session even if a token refresh was already in progress.',
        googleAccountLinking:
          'Google account linking now finishes before Nestra signs you in, and signing out leaves Google sign-in ready to use again.',
        androidGoogleReturn:
          'Google sign-in now returns directly to Nestra on Android, with a clear recovery page if the app cannot open.',
        googleFirstSignInReliability:
          "Google sign-in now works reliably on the first attempt after Nestra's service starts.",
        newNoteDraftMigration:
          'Creating a note now keeps your latest edits and no longer leaves a leftover draft that can reopen in a new note.',
        updatePromptCoordination:
          'Desktop update prompts wait until What’s New is finished, and checking for updates from About still works if a background check just finished.',
      },
    },
    v020: {
      changes: {
        desktopUpdates: 'Nestra has an autoupdater!',
        diagnosticsBack: 'Back arrow button added to the developer diagnostics screen.',
        narrowLayout: 'Nestra now works on screens as narrow as 320 px.',
        centeredNavigation: 'Navigation icons stay visually centered on compact layouts.',
        releaseHistory:
          'The About screen now includes a curated version history, with a "What’s new" summary after an update.',
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
