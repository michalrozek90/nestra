import type { LoginRequest } from '@nestra/contracts';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { runtimeConfig } from '@/config/runtime-config';
import {
  exchangeGoogleLink,
  exchangeGoogleSignIn,
  login,
  startGoogleLink,
  startGoogleSignIn,
} from '@/infrastructure/auth/auth-api';
import { getAuthApiErrorCode, getAuthErrorTranslationKey } from '@/infrastructure/auth/auth-error';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';
import { externalAuthBrowser } from './external-auth-browser';
import { externalAuthCallbackSource } from './external-auth-callback-source';
import {
  isGoogleAuthCallbackUrl,
  removeGoogleCallbackFromBrowserHistory,
} from './google-auth-callback';
import { createGoogleHandoffProof } from './google-auth-crypto';
import { GoogleAuthFlowController } from './google-auth-flow';
import { getGoogleAuthPlatform, getGoogleAuthReturnUri } from './google-auth-platform';
import type { GoogleAuthErrorKey, GoogleAuthState } from './google-auth.types';
import { pendingExternalAuthStorage } from './pending-external-auth-storage';

type GoogleAuthContextValue = {
  readonly isEnabled: boolean;
  readonly state: GoogleAuthState;
  readonly startSignIn: () => Promise<void>;
  readonly confirmLink: (request: LoginRequest) => Promise<void>;
  readonly dismissLinkConfirmation: () => void;
  readonly dismissFeedback: () => void;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

function getGoogleAuthErrorKey(error: unknown): GoogleAuthErrorKey {
  const translationKey = getAuthErrorTranslationKey(error);
  switch (translationKey) {
    case 'errors.invalidCredentials':
    case 'errors.sessionStorageUnavailable':
    case 'errors.google.provider':
    case 'errors.google.invalidCallback':
    case 'errors.google.expiredHandoff':
    case 'errors.google.usedHandoff':
    case 'errors.google.emailUnverified':
    case 'errors.google.emailMismatch':
    case 'errors.google.identityConflict':
    case 'errors.google.unavailable':
      return translationKey;
    case 'errors.serviceUnavailable':
      return 'errors.google.network';
    case 'errors.emailAlreadyRegistered':
    case 'errors.sessionExpired':
    case 'errors.validationFailed':
    case 'errors.unexpected':
      return 'errors.unexpected';
  }
}

export function GoogleAuthProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { completeAuthentication, status: authenticationStatus } = useAuth();
  const queuedCallbackUrlRef = useRef<string | null>(null);
  const platform = getGoogleAuthPlatform();
  const returnUri = getGoogleAuthReturnUri(platform);
  const navigateToNotes = useCallback(() => router.replace('/notes'), [router]);
  const controller = useMemo(
    () =>
      new GoogleAuthFlowController({
        browser: externalAuthBrowser,
        pendingStorage: pendingExternalAuthStorage,
        platform,
        returnUri,
        createHandoffProof: createGoogleHandoffProof,
        startSignIn: startGoogleSignIn,
        exchangeSignIn: exchangeGoogleSignIn,
        login,
        startLink: startGoogleLink,
        exchangeLink: exchangeGoogleLink,
        completeAuthentication,
        navigateToNotes,
        getApiErrorCode: getAuthApiErrorCode,
        getErrorKey: getGoogleAuthErrorKey,
        now: Date.now,
      }),
    [completeAuthentication, navigateToNotes, platform, returnUri],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  const queueOrProcessCallback = useCallback(
    (callbackUrl: string) => {
      if (!runtimeConfig.isGoogleAuthEnabled) {
        return;
      }

      if (!isGoogleAuthCallbackUrl(callbackUrl, returnUri)) {
        return;
      }

      removeGoogleCallbackFromBrowserHistory(returnUri);

      if (authenticationStatus === 'unknown') {
        queuedCallbackUrlRef.current = callbackUrl;
        return;
      }

      void controller.resumeCallback(callbackUrl);
    },
    [authenticationStatus, controller, returnUri],
  );

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => undefined;

    void externalAuthCallbackSource
      .getInitialCallbackUrl()
      .then((callbackUrl) => {
        if (isMounted && callbackUrl) {
          queueOrProcessCallback(callbackUrl);
        }
      })
      .catch((error: unknown) => {
        logger.error('External authentication callback initialization failed', error);
      });

    void externalAuthCallbackSource
      .subscribe(queueOrProcessCallback)
      .then((resolvedUnsubscribe) => {
        if (isMounted) {
          unsubscribe = resolvedUnsubscribe;
        } else {
          resolvedUnsubscribe();
        }
      })
      .catch((error: unknown) => {
        logger.error('External authentication callback subscription failed', error);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [queueOrProcessCallback]);

  useEffect(() => {
    if (authenticationStatus === 'unknown' || !queuedCallbackUrlRef.current) {
      return;
    }

    const callbackUrl = queuedCallbackUrlRef.current;
    queuedCallbackUrlRef.current = null;
    void controller.resumeCallback(callbackUrl);
  }, [authenticationStatus, controller]);

  useEffect(() => {
    if (state.status === 'feedback' && authenticationStatus === 'unauthenticated') {
      router.replace('/login');
    }
  }, [authenticationStatus, router, state.status]);

  const contextValue = useMemo<GoogleAuthContextValue>(
    () => ({
      isEnabled: runtimeConfig.isGoogleAuthEnabled,
      state,
      startSignIn: () => controller.startSignIn(),
      confirmLink: (request) => controller.confirmLink(request),
      dismissLinkConfirmation: () => controller.dismissLinkConfirmation(),
      dismissFeedback: () => controller.dismissFeedback(),
    }),
    [controller, state],
  );

  return (
    <GoogleAuthContext.Provider value={contextValue}>
      {children}
      <Snackbar
        duration={6_000}
        onDismiss={contextValue.dismissFeedback}
        visible={state.status === 'feedback' && authenticationStatus === 'authenticated'}
      >
        {state.status === 'feedback' ? t(state.messageKey) : ''}
      </Snackbar>
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth(): GoogleAuthContextValue {
  const contextValue = useContext(GoogleAuthContext);
  if (!contextValue) {
    throw new Error('useGoogleAuth must be used within GoogleAuthProvider.');
  }

  return contextValue;
}
