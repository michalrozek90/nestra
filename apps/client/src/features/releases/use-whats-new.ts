import { useCallback, useEffect, useState } from 'react';

import { runtimeConfig } from '@/config/runtime-config';
import { logger } from '@/infrastructure/logging/logger';
import {
  markPreferenceStorageUnavailable,
  readLastSeenReleaseNotesVersion,
  writeLastSeenReleaseNotesVersion,
} from '@/infrastructure/storage/preference-storage';

import { resolveWhatsNewLaunch, type WhatsNewLaunchState } from './resolve-whats-new-launch';

const initialState: WhatsNewLaunchState = {
  isReady: false,
  isVisible: false,
  releaseNotes: [],
  version: null,
};

export function useWhatsNew() {
  const [state, setState] = useState<WhatsNewLaunchState>(initialState);
  const applicationVersion = runtimeConfig.applicationVersion;

  useEffect(() => {
    let isCancelled = false;

    async function resolveWhatsNewVisibility(): Promise<void> {
      const nextState = await resolveWhatsNewLaunch(applicationVersion, {
        onPreferenceStorageError: (operation, error) => {
          markPreferenceStorageUnavailable('releaseNotes');
          logger.error(
            operation === 'read'
              ? 'Last seen release notes version could not be read'
              : 'Last seen release notes version could not be saved',
            error,
          );
        },
        readLastSeenVersion: readLastSeenReleaseNotesVersion,
        writeLastSeenVersion: writeLastSeenReleaseNotesVersion,
      });

      if (!isCancelled) {
        setState(nextState);
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
