import type { AuthenticationSessionResponse, PublicUser } from '@nestra/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { registerAuthenticationFailureHandler } from '@/infrastructure/api/api-client';
import { logger } from '@/infrastructure/logging/logger';
import { logout, refreshSession } from './auth-api';
import { isRecoverableConnectionError } from './auth-error';
import {
  clearAuthenticationSessionTokens,
  invalidateAuthenticationPersistence,
  persistAuthenticationSessionTokens,
} from './auth-session-storage';
import { authTokenStorage } from './auth-token-storage';

export type AuthenticationStatus = 'unknown' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  readonly status: AuthenticationStatus;
  readonly user: PublicUser | null;
  readonly isSigningOut: boolean;
  readonly completeAuthentication: (session: AuthenticationSessionResponse) => Promise<void>;
  readonly signOut: () => Promise<void>;
};

const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;
const SESSION_RESTORE_MAX_ATTEMPTS = 2;
const SESSION_RESTORE_RETRY_DELAY_MS = 4_000;
const AuthContext = createContext<AuthContextValue | null>(null);

async function clearStoredTokensSafely(): Promise<void> {
  try {
    await clearAuthenticationSessionTokens();
  } catch (error: unknown) {
    logger.error('Authentication tokens could not be cleared', error);
  }
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function restoreAuthenticationSession(): Promise<PublicUser | null> {
  const [accessToken, refreshToken] = await Promise.all([
    authTokenStorage.getAccessToken(),
    authTokenStorage.getRefreshToken(),
  ]);

  if (!refreshToken) {
    if (accessToken) {
      await clearStoredTokensSafely();
    }
    return null;
  }

  let attempt = 0;
  while (attempt < SESSION_RESTORE_MAX_ATTEMPTS) {
    attempt += 1;
    try {
      const session = await refreshSession({ refreshToken });
      await persistAuthenticationSessionTokens(session);
      return session.user;
    } catch (error: unknown) {
      if (!isRecoverableConnectionError(error)) {
        await clearStoredTokensSafely();
        return null;
      }

      if (attempt >= SESSION_RESTORE_MAX_ATTEMPTS) {
        break;
      }

      logger.warn('Session restoration recoverable failure; retrying');
      await wait(SESSION_RESTORE_RETRY_DELAY_MS);
    }
  }

  logger.warn('Session restoration exhausted recoverable attempts');
  await clearStoredTokensSafely();
  return null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: restoreAuthenticationSession,
    gcTime: Number.POSITIVE_INFINITY,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const clearSessionState = useCallback(() => {
    client.setQueryData<PublicUser | null>(AUTH_SESSION_QUERY_KEY, null);
  }, [client]);

  useEffect(() => registerAuthenticationFailureHandler(clearSessionState), [clearSessionState]);

  const completeAuthentication = useCallback(
    async (session: AuthenticationSessionResponse) => {
      try {
        await persistAuthenticationSessionTokens(session);
      } catch (storageError: unknown) {
        try {
          await logout({ refreshToken: session.refreshToken });
        } catch {
          logger.warn('Authentication session cleanup did not reach the API');
        }
        throw storageError;
      }
      client.setQueryData<PublicUser>(AUTH_SESSION_QUERY_KEY, session.user);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    // Fence in-flight refresh persistence before the logout network round-trip.
    invalidateAuthenticationPersistence();
    try {
      let refreshToken: string | null = null;
      try {
        refreshToken = await authTokenStorage.getRefreshToken();
      } catch (error: unknown) {
        logger.error('Refresh token could not be read during sign-out', error);
      }

      if (refreshToken) {
        try {
          await logout({ refreshToken });
        } catch {
          logger.warn('Server sign-out did not complete; continuing with local sign-out');
        }
      }
    } finally {
      await clearStoredTokensSafely();
      client.clear();
      client.setQueryData<PublicUser | null>(AUTH_SESSION_QUERY_KEY, null);
      setIsSigningOut(false);
    }
  }, [client, isSigningOut]);

  const user = sessionQuery.data ?? null;
  const status: AuthenticationStatus = sessionQuery.isPending
    ? 'unknown'
    : user
      ? 'authenticated'
      : 'unauthenticated';

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSigningOut,
      completeAuthentication,
      signOut,
    }),
    [completeAuthentication, isSigningOut, user, signOut, status],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contextValue = useContext(AuthContext);
  if (!contextValue) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return contextValue;
}
