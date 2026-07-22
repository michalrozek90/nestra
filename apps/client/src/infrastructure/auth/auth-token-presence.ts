import { authTokenStorage } from './auth-token-storage';

export type AuthenticationTokenPresence = {
  readonly hasAccessToken: boolean;
  readonly hasRefreshToken: boolean;
};

export async function getAuthenticationTokenPresence(): Promise<AuthenticationTokenPresence> {
  const [accessToken, refreshToken] = await Promise.all([
    authTokenStorage.getAccessToken(),
    authTokenStorage.getRefreshToken(),
  ]);

  return {
    hasAccessToken: accessToken !== null,
    hasRefreshToken: refreshToken !== null,
  };
}
