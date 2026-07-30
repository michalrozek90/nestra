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
  versions: {
    v010: {
      title: 'Recent improvements',
      changes: {
        diagnosticsBack:
          'A back arrow on the developer diagnostics screen lets you return to Settings.',
        narrowLayout: 'The layout works better on very narrow screens, starting at 320 px wide.',
        centeredNavigation: 'Navigation icons stay visually centered on compact layouts.',
        patientSessionRestore:
          'Restoring your session waits longer and retries briefly when the connection is slow, instead of failing right away.',
      },
    },
  },
} as const;
