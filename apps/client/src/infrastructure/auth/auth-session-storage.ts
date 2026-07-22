import type { AuthenticationSessionResponse } from '@nestra/contracts';

import { authTokenStorage } from './auth-token-storage';

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
    throw error;
  }
}
