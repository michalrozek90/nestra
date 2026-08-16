export type ReleaseChange = {
  readonly descriptionTranslationKey: string;
};

export type ReleaseChangeGroups = {
  readonly fixes: readonly ReleaseChange[];
  readonly new: readonly ReleaseChange[];
};

export type ReleaseNote = {
  readonly version: string;
  readonly releaseDate?: string;
  readonly changes: ReleaseChangeGroups;
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '0.3.0',
    changes: {
      new: [
        {
          descriptionTranslationKey: 'versions.v030.changes.googleAuthentication',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.completeReleaseHistory',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.creatorCredit',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.developerDiagnosticsHealth',
        },
      ],
      fixes: [
        {
          descriptionTranslationKey: 'versions.v030.changes.serviceOutageErrors',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.sessionRequestIsolation',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.signOutRefreshRace',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.googleAccountLinking',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.newNoteDraftMigration',
        },
        {
          descriptionTranslationKey: 'versions.v030.changes.updatePromptCoordination',
        },
      ],
    },
  },
  {
    version: '0.2.0',
    releaseDate: '2026-07-31',
    changes: {
      new: [
        {
          descriptionTranslationKey: 'versions.v020.changes.desktopUpdates',
        },
        {
          descriptionTranslationKey: 'versions.v020.changes.diagnosticsBack',
        },
        {
          descriptionTranslationKey: 'versions.v020.changes.releaseHistory',
        },
      ],
      fixes: [
        {
          descriptionTranslationKey: 'versions.v020.changes.narrowLayout',
        },
        {
          descriptionTranslationKey: 'versions.v020.changes.centeredNavigation',
        },
      ],
    },
  },
  {
    version: '0.1.0',
    releaseDate: '2026-07-29',
    changes: {
      new: [
        {
          descriptionTranslationKey: 'versions.v010.changes.titleOnlyNotes',
        },
      ],
      fixes: [
        {
          descriptionTranslationKey: 'versions.v010.changes.responsiveDialogs',
        },
        {
          descriptionTranslationKey: 'versions.v010.changes.editorFocus',
        },
        {
          descriptionTranslationKey: 'versions.v010.changes.patientSessionRestore',
        },
        {
          descriptionTranslationKey: 'versions.v010.changes.packagedDesktopAssets',
        },
      ],
    },
  },
] as const;

export function getReleaseNotesNewestFirst(applicationVersion: string): readonly ReleaseNote[] {
  return RELEASE_NOTES.filter(
    (releaseNote) => compareVersions(releaseNote.version, applicationVersion) <= 0,
  ).sort((left, right) => compareVersions(right.version, left.version));
}

export function getUnseenReleaseNotesNewestFirst(
  lastSeenVersion: string | null,
  applicationVersion: string,
): readonly ReleaseNote[] {
  return getReleaseNotesNewestFirst(applicationVersion).filter(
    (releaseNote) =>
      lastSeenVersion === null || compareVersions(releaseNote.version, lastSeenVersion) > 0,
  );
}

function compareVersions(leftVersion: string, rightVersion: string): number {
  const leftParts = parseVersionParts(leftVersion);
  const rightParts = parseVersionParts(rightVersion);
  const partCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

function parseVersionParts(version: string): readonly number[] {
  return version.split('.').map((part) => {
    const parsedPart = Number.parseInt(part, 10);
    return Number.isFinite(parsedPart) ? parsedPart : 0;
  });
}
