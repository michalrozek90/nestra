import type { AuthenticationSessionResponse, PublicUser } from '@nestra/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { registerAuthenticationFailureHandler } from '@/infrastructure/api/api-client';
import { logger } from '@/infrastructure/logging/logger';
import { logout, refreshSession } from './auth-api';
import { isRecoverableConnectionError } from './auth-error';
import { persistAuthenticationSessionTokens } from './auth-session-storage';
import { authTokenStorage } from './auth-token-storage';

export type AuthenticationStatus =
  'unknown' | 'authenticated' | 'unauthenticated' | 'restoration-error';

type AuthContextValue = {
  readonly status: AuthenticationStatus;
  readonly user: PublicUser | null;
  readonly hasAccessToken: boolean;
  readonly hasRefreshToken: boolean;
  readonly isSigningOut: boolean;
  readonly completeAuthentication: (session: AuthenticationSessionResponse) => Promise<void>;
  readonly retryRestoration: () => Promise<void>;
  readonly clearLocalSession: () => Promise<void>;
  readonly signOut: () => Promise<void>;
};

const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;
const AuthContext = createContext<AuthContextValue | null>(null);

async function clearStoredTokensSafely(): Promise<void> {
  try {
    await authTokenStorage.clear();
  } catch (error: unknown) {
    logger.error('Authentication tokens could not be cleared', error);
  }
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

  try {
    const session = await refreshSession({ refreshToken });
    await persistAuthenticationSessionTokens(session);
    return session.user;
  } catch (error: unknown) {
    if (isRecoverableConnectionError(error)) {
      throw error;
    }

    await clearStoredTokensSafely();
    return null;
  }
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
      await persistAuthenticationSessionTokens(session);
      client.setQueryData<PublicUser>(AUTH_SESSION_QUERY_KEY, session.user);
    },
    [client],
  );

  const retryRestoration = useCallback(async () => {
    await sessionQuery.refetch();
  }, [sessionQuery]);

  const clearLocalSession = useCallback(async () => {
    await clearStoredTokensSafely();
    clearSessionState();
  }, [clearSessionState]);

  const signOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      const refreshToken = await authTokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          await logout({ refreshToken });
        } catch {
          // Local logout is authoritative even when the API is unavailable.
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
    : sessionQuery.isError
      ? 'restoration-error'
      : user
        ? 'authenticated'
        : 'unauthenticated';

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      hasAccessToken: user !== null,
      hasRefreshToken: user !== null,
      isSigningOut,
      completeAuthentication,
      retryRestoration,
      clearLocalSession,
      signOut,
    }),
    [
      clearLocalSession,
      completeAuthentication,
      isSigningOut,
      retryRestoration,
      user,
      signOut,
      status,
    ],
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
