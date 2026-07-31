export type ReleaseChange = {
  readonly descriptionTranslationKey: string;
};

export type ReleaseNote = {
  readonly version: string;
  readonly releaseDate: string;
  readonly titleTranslationKey: string;
  readonly changes: readonly ReleaseChange[];
};

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '0.2.0',
    releaseDate: '2026-07-31',
    titleTranslationKey: 'versions.v020.title',
    changes: [
      {
        descriptionTranslationKey: 'versions.v020.changes.desktopUpdates',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.safeUpdateRestart',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.quietAutomaticChecks',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.diagnosticsBack',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.narrowLayout',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.centeredNavigation',
      },
      {
        descriptionTranslationKey: 'versions.v020.changes.releaseHistory',
      },
    ],
  },
  {
    version: '0.1.0',
    releaseDate: '2026-07-29',
    titleTranslationKey: 'versions.v010.title',
    changes: [
      {
        descriptionTranslationKey: 'versions.v010.changes.responsiveDialogs',
      },
      {
        descriptionTranslationKey: 'versions.v010.changes.editorFocus',
      },
      {
        descriptionTranslationKey: 'versions.v010.changes.titleOnlyNotes',
      },
      {
        descriptionTranslationKey: 'versions.v010.changes.patientSessionRestore',
      },
      {
        descriptionTranslationKey: 'versions.v010.changes.packagedDesktopAssets',
      },
    ],
  },
] as const;

export function getPublishedReleaseNotesNewestFirst(): readonly ReleaseNote[] {
  return [...RELEASE_NOTES].sort((left, right) =>
    compareVersionsDescending(left.version, right.version),
  );
}

export function getReleaseNoteForVersion(version: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((releaseNote) => releaseNote.version === version);
}

function compareVersionsDescending(leftVersion: string, rightVersion: string): number {
  const leftParts = parseVersionParts(leftVersion);
  const rightParts = parseVersionParts(rightVersion);
  const partCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
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
