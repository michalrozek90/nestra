import { useCallback, useEffect, useState } from 'react';

import { runtimeConfig } from '@/config/runtime-config';
import { logger } from '@/infrastructure/logging/logger';
import {
  markPreferenceStorageUnavailable,
  readLastSeenReleaseNotesVersion,
  writeLastSeenReleaseNotesVersion,
} from '@/infrastructure/storage/preference-storage';

import { getUnseenReleaseNotesNewestFirst, type ReleaseNote } from './release-notes';

type WhatsNewState = {
  readonly isReady: boolean;
  readonly isVisible: boolean;
  readonly releaseNotes: readonly ReleaseNote[];
  readonly version: string | null;
};

const initialState: WhatsNewState = {
  isReady: false,
  isVisible: false,
  releaseNotes: [],
  version: null,
};

export function useWhatsNew() {
  const [state, setState] = useState<WhatsNewState>(initialState);
  const applicationVersion = runtimeConfig.applicationVersion;

  useEffect(() => {
    let isCancelled = false;

    async function resolveWhatsNewVisibility(): Promise<void> {
      try {
        const lastSeenVersion = await readLastSeenReleaseNotesVersion();
        const releaseNotes = getUnseenReleaseNotesNewestFirst(lastSeenVersion, applicationVersion);

        if (isCancelled) {
          return;
        }

        setState({
          isReady: true,
          isVisible: releaseNotes.length > 0,
          releaseNotes,
          version: applicationVersion,
        });
      } catch (error: unknown) {
        markPreferenceStorageUnavailable('releaseNotes');
        logger.error('Last seen release notes version could not be read', error);

        if (!isCancelled) {
          setState({
            isReady: true,
            isVisible: false,
            releaseNotes: [],
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
    releaseNotes: state.isVisible ? state.releaseNotes : [],
    version: state.version,
  };
}
