import type { AuthenticationSessionResponse } from '@nestra/contracts';

import { authTokenStorage } from './auth-token-storage';

export class AuthenticationSessionStorageError extends Error {
  public constructor(cause: unknown) {
    super('The authentication session could not be stored.', { cause });
    this.name = 'AuthenticationSessionStorageError';
  }
}

/**
 * Monotonic fence for local auth writes. Bumped whenever the client abandons the current
 * session so an in-flight refresh cannot recreate tokens after sign-out or invalidation.
 */
let authenticationPersistenceEpoch = 0;

export function invalidateAuthenticationPersistence(): void {
  authenticationPersistenceEpoch += 1;
}

export async function clearAuthenticationSessionTokens(): Promise<void> {
  invalidateAuthenticationPersistence();
  await authTokenStorage.clear();
}

async function clearPersistedTokensIfCurrent(sessionRefreshToken: string): Promise<void> {
  const storedRefreshToken = await authTokenStorage.getRefreshToken();
  if (storedRefreshToken === null || storedRefreshToken === sessionRefreshToken) {
    await clearAuthenticationSessionTokens();
  }
}

export async function persistAuthenticationSessionTokens(
  session: AuthenticationSessionResponse,
): Promise<void> {
  const persistenceEpoch = authenticationPersistenceEpoch;

  try {
    // Publishing the session identity first prevents stale requests from observing a new access
    // token as if it still belonged to the previous refresh session.
    await authTokenStorage.setRefreshToken(session.refreshToken);
    await authTokenStorage.setAccessToken(session.accessToken);

    if (authenticationPersistenceEpoch !== persistenceEpoch) {
      // A newer sign-in may already own storage; only remove tokens we ourselves just wrote.
      await clearPersistedTokensIfCurrent(session.refreshToken);
      throw new AuthenticationSessionStorageError(
        new Error('Authentication persistence was invalidated before completion.'),
      );
    }
  } catch (error: unknown) {
    if (error instanceof AuthenticationSessionStorageError) {
      throw error;
    }

    try {
      await clearPersistedTokensIfCurrent(session.refreshToken);
    } catch {
      // Preserve the original storage failure while still making a best-effort cleanup.
    }
    throw new AuthenticationSessionStorageError(error);
  }
}
