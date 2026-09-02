import { getUnseenReleaseNotesNewestFirst, type ReleaseNote } from './release-notes';

export type WhatsNewLaunchState = {
  readonly isReady: boolean;
  readonly isVisible: boolean;
  readonly releaseNotes: readonly ReleaseNote[];
  readonly version: string | null;
};

type PreferenceStorageOperation = 'read' | 'write';

export type WhatsNewLaunchDependencies = {
  readonly onPreferenceStorageError: (
    operation: PreferenceStorageOperation,
    error: unknown,
  ) => void;
  readonly readLastSeenVersion: () => Promise<string | null>;
  readonly writeLastSeenVersion: (version: string) => Promise<void>;
};

const hiddenState: WhatsNewLaunchState = {
  isReady: true,
  isVisible: false,
  releaseNotes: [],
  version: null,
};

export async function resolveWhatsNewLaunch(
  applicationVersion: string,
  dependencies: WhatsNewLaunchDependencies,
): Promise<WhatsNewLaunchState> {
  let lastSeenVersion: string | null;

  try {
    lastSeenVersion = await dependencies.readLastSeenVersion();
  } catch (error: unknown) {
    dependencies.onPreferenceStorageError('read', error);
    return hiddenState;
  }

  if (lastSeenVersion === null) {
    try {
      await dependencies.writeLastSeenVersion(applicationVersion);
    } catch (error: unknown) {
      dependencies.onPreferenceStorageError('write', error);
    }

    return hiddenState;
  }

  const releaseNotes = getUnseenReleaseNotesNewestFirst(lastSeenVersion, applicationVersion);

  return {
    isReady: true,
    isVisible: releaseNotes.length > 0,
    releaseNotes,
    version: applicationVersion,
  };
}
