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
    await authTokenStorage.setAccessToken(session.accessToken);
    await authTokenStorage.setRefreshToken(session.refreshToken);
  } catch (error: unknown) {
    try {
      await authTokenStorage.clear();
    } catch {
      // Preserve the original storage failure while still making a best-effort cleanup.
    }
    throw new AuthenticationSessionStorageError(error);
  }
}
