import type { AuthenticationSessionResponse } from '@nestra/contracts';

import { authTokenStorage } from './auth-token-storage';

export class AuthenticationSessionStorageError extends Error {
  public constructor(cause: unknown) {
    super('The authentication session could not be stored.', { cause });
    this.name = 'AuthenticationSessionStorageError';
  }
}

export async function persistAuthenticationSessionTokens(
  session: AuthenticationSessionResponse,
): Promise<void> {
  try {
    // Publishing the session identity first prevents stale requests from observing a new access
    // token as if it still belonged to the previous refresh session.
    await authTokenStorage.setRefreshToken(session.refreshToken);
    await authTokenStorage.setAccessToken(session.accessToken);
  } catch (error: unknown) {
    try {
      await authTokenStorage.clear();
    } catch {
      // Preserve the original storage failure while still making a best-effort cleanup.
    }
    throw new AuthenticationSessionStorageError(error);
  }
}
