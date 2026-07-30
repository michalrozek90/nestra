import { useCallback, useEffect, useState } from 'react';

import { runtimeConfig } from '@/config/runtime-config';
import { logger } from '@/infrastructure/logging/logger';
import {
  markPreferenceStorageUnavailable,
  readLastSeenReleaseNotesVersion,
  writeLastSeenReleaseNotesVersion,
} from '@/infrastructure/storage/preference-storage';

import { getReleaseNoteForVersion, type ReleaseNote } from './release-notes';

type WhatsNewState = {
  readonly isReady: boolean;
  readonly isVisible: boolean;
  readonly releaseNote: ReleaseNote | undefined;
  readonly version: string | null;
};

const initialState: WhatsNewState = {
  isReady: false,
  isVisible: false,
  releaseNote: undefined,
  version: null,
};

export function useWhatsNew() {
  const [state, setState] = useState<WhatsNewState>(initialState);
  const applicationVersion = runtimeConfig.applicationVersion;

  useEffect(() => {
    let isCancelled = false;

    async function resolveWhatsNewVisibility(): Promise<void> {
      const releaseNote = getReleaseNoteForVersion(applicationVersion);

      if (!releaseNote) {
        if (!isCancelled) {
          setState({
            isReady: true,
            isVisible: false,
            releaseNote: undefined,
            version: null,
          });
        }

        return;
      }

      try {
        const lastSeenVersion = await readLastSeenReleaseNotesVersion();

        if (isCancelled) {
          return;
        }

        setState({
          isReady: true,
          isVisible: lastSeenVersion !== applicationVersion,
          releaseNote,
          version: applicationVersion,
        });
      } catch (error: unknown) {
        markPreferenceStorageUnavailable('releaseNotes');
        logger.error('Last seen release notes version could not be read', error);

        if (!isCancelled) {
          setState({
            isReady: true,
            isVisible: false,
            releaseNote: undefined,
            version: null,
          });
        }
      }
    }

    void resolveWhatsNewVisibility();

    return () => {
      isCancelled = true;
    };
  }, [applicationVersion]);

  const dismiss = useCallback(async (): Promise<void> => {
    const versionToMark = state.version;

    setState((currentState) => ({
      ...currentState,
      isVisible: false,
    }));

    if (!versionToMark) {
      return;
    }

    try {
      await writeLastSeenReleaseNotesVersion(versionToMark);
    } catch (error: unknown) {
      markPreferenceStorageUnavailable('releaseNotes');
      logger.error('Last seen release notes version could not be saved', error);
    }
  }, [state.version]);

  return {
    dismiss,
    isReady: state.isReady,
    isVisible: state.isVisible,
    releaseNote: state.isVisible ? state.releaseNote : undefined,
    version: state.version,
  };
}
