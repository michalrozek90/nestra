import releaseNotesData from './release-notes-data.json';

export type ReleaseChange = {
  readonly descriptionTranslationKey: string;
};

type ReleaseChangeGroups = {
  readonly fixes: readonly ReleaseChange[];
  readonly new: readonly ReleaseChange[];
};

type StoredReleaseChangeGroups = {
  readonly fixes: readonly string[];
  readonly new: readonly string[];
};

type StoredReleaseNote = {
  readonly version: string;
  readonly releaseDate: string;
  readonly changes: StoredReleaseChangeGroups;
};

type ReleaseNotesData = {
  readonly unreleased: StoredReleaseChangeGroups;
  readonly released: readonly StoredReleaseNote[];
};

export type ReleaseNote = {
  readonly version: string;
  readonly releaseDate: string;
  readonly changes: ReleaseChangeGroups;
};

const typedReleaseNotesData: ReleaseNotesData = releaseNotesData;

const RELEASE_NOTES: readonly ReleaseNote[] = typedReleaseNotesData.released.map((releaseNote) => ({
  ...releaseNote,
  changes: {
    new: releaseNote.changes.new.map(createReleaseChange),
    fixes: releaseNote.changes.fixes.map(createReleaseChange),
  },
}));

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

function createReleaseChange(changeId: string): ReleaseChange {
  return {
    descriptionTranslationKey: `releaseNoteChanges.${changeId}`,
  };
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
