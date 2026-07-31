import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/infrastructure/auth/auth-provider';
import { prepareForApplicationRestart } from '@/infrastructure/lifecycle/application-restart';
import { logger } from '@/infrastructure/logging/logger';
import { applicationUpdatePlatform } from './application-update-platform';
import type {
  ApplicationUpdateErrorCode,
  ApplicationUpdateHandle,
  ApplicationUpdateState,
} from './application-update.types';

type ApplicationUpdateContextValue = {
  readonly state: ApplicationUpdateState;
  readonly isPromptVisible: boolean;
  readonly checkForUpdate: () => Promise<void>;
  readonly installAvailableUpdate: () => Promise<void>;
  readonly dismissPrompt: () => void;
  readonly dismissError: () => void;
};

type ApplicationUpdateCheckOrigin = 'automatic' | 'manual';

const ApplicationUpdateContext = createContext<ApplicationUpdateContextValue | null>(null);

function toAvailableState(update: ApplicationUpdateHandle): ApplicationUpdateState {
  return {
    status: 'available',
    version: update.version,
    ...(update.notes ? { notes: update.notes } : {}),
  };
}

export function ApplicationUpdateProvider({ children }: PropsWithChildren) {
  const { status: authStatus } = useAuth();
  const [state, setState] = useState<ApplicationUpdateState>(
    applicationUpdatePlatform.isSupported ? { status: 'idle' } : { status: 'unsupported' },
  );
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const updateRef = useRef<ApplicationUpdateHandle | null>(null);
  const operationPromiseRef = useRef<Promise<void> | null>(null);
  const hasDownloadedRef = useRef(false);
  const hasInstalledRef = useRef(false);
  const hasStartedAutomaticCheckRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      const update = updateRef.current;
      if (update) {
        void update.close().catch(() => undefined);
      }
    };
  }, []);

  const setSafeError = useCallback((code: ApplicationUpdateErrorCode, version?: string) => {
    logger.warn('Application update operation failed', {
      code,
      ...(version ? { version } : {}),
    });
    if (isMountedRef.current) {
      setState({ status: 'recoverable-error', code, ...(version ? { version } : {}) });
    }
  }, []);

  const runCheck = useCallback(
    async (checkOrigin: ApplicationUpdateCheckOrigin) => {
      if (!applicationUpdatePlatform.isSupported) {
        return;
      }

      const existingOperation = operationPromiseRef.current;
      if (existingOperation) {
        await existingOperation;
        return;
      }

      const operation = (async () => {
        setState({ status: 'checking' });
        try {
          const previousUpdate = updateRef.current;
          const update = await applicationUpdatePlatform.check();
          if (previousUpdate) {
            await previousUpdate.close().catch(() => undefined);
          }
          updateRef.current = update;
          hasDownloadedRef.current = false;
          hasInstalledRef.current = false;

          if (!isMountedRef.current) {
            return;
          }
          if (!update) {
            setState({ status: 'up-to-date' });
            return;
          }

          setState(toAvailableState(update));
          if (checkOrigin === 'automatic') {
            setIsPromptVisible(true);
          }
        } catch {
          if (checkOrigin === 'automatic') {
            logger.warn('Automatic application update check failed', { code: 'check-failed' });
            if (isMountedRef.current) {
              setState({ status: 'idle' });
            }
          } else {
            setSafeError('check-failed');
          }
        }
      })().finally(() => {
        operationPromiseRef.current = null;
      });

      operationPromiseRef.current = operation;
      await operation;
    },
    [setSafeError],
  );

  const checkForUpdate = useCallback(async () => runCheck('manual'), [runCheck]);

  useEffect(() => {
    if (
      authStatus === 'unknown' ||
      !applicationUpdatePlatform.isSupported ||
      hasStartedAutomaticCheckRef.current
    ) {
      return;
    }

    hasStartedAutomaticCheckRef.current = true;
    void runCheck('automatic');
  }, [authStatus, runCheck]);

  const installAvailableUpdate = useCallback(async () => {
    const existingOperation = operationPromiseRef.current;
    if (existingOperation) {
      await existingOperation;
      return;
    }

    const update = updateRef.current;
    if (!update) {
      return;
    }

    setIsPromptVisible(true);
    const operation = (async () => {
      const version = update.version;

      if (!hasDownloadedRef.current) {
        setState({ status: 'downloading', version, downloadedBytes: 0 });
        try {
          await update.download((progress) => {
            if (isMountedRef.current) {
              setState({ status: 'downloading', version, ...progress });
            }
          });
          hasDownloadedRef.current = true;
        } catch {
          setSafeError('download-failed', version);
          return;
        }
      }

      if (!hasInstalledRef.current) {
        try {
          if (!(await prepareForApplicationRestart())) {
            setSafeError('local-save-failed', version);
            return;
          }
        } catch {
          setSafeError('local-save-failed', version);
          return;
        }

        setState({ status: 'installing', version });
        try {
          await update.install();
          hasInstalledRef.current = true;
        } catch {
          setSafeError('install-failed', version);
          return;
        }
      }

      setState({ status: 'restart-required', version });
      try {
        await applicationUpdatePlatform.relaunch();
      } catch {
        setSafeError('restart-failed', version);
      }
    })().finally(() => {
      operationPromiseRef.current = null;
    });

    operationPromiseRef.current = operation;
    await operation;
  }, [setSafeError]);

  const dismissPrompt = useCallback(() => {
    setIsPromptVisible(false);
  }, []);

  const dismissError = useCallback(() => {
    const update = updateRef.current;
    setState((currentState) =>
      update &&
      currentState.status === 'recoverable-error' &&
      currentState.code === 'restart-failed'
        ? { status: 'restart-required', version: update.version }
        : update
          ? toAvailableState(update)
          : { status: 'idle' },
    );
    setIsPromptVisible(false);
  }, []);

  const contextValue = useMemo<ApplicationUpdateContextValue>(
    () => ({
      state,
      isPromptVisible,
      checkForUpdate,
      installAvailableUpdate,
      dismissPrompt,
      dismissError,
    }),
    [state, isPromptVisible, checkForUpdate, installAvailableUpdate, dismissPrompt, dismissError],
  );

  return (
    <ApplicationUpdateContext.Provider value={contextValue}>
      {children}
    </ApplicationUpdateContext.Provider>
  );
}

export function useApplicationUpdate(): ApplicationUpdateContextValue {
  const context = useContext(ApplicationUpdateContext);
  if (!context) {
    throw new Error('useApplicationUpdate must be used within ApplicationUpdateProvider');
  }
  return context;
}
