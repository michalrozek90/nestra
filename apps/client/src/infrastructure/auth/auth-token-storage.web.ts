import type { AuthTokenStorage } from './auth-token-storage';

const ACCESS_TOKEN_KEY = 'nestra.auth.accessToken';
const REFRESH_TOKEN_KEY = 'nestra.auth.refreshToken';

function getLocalStorage(): Storage {
  if (typeof localStorage === 'undefined') {
    throw new Error('Web authentication storage is unavailable.');
  }

  return localStorage;
}

class WebAuthTokenStorage implements AuthTokenStorage {
  public getAccessToken(): Promise<string | null> {
    return Promise.resolve(getLocalStorage().getItem(ACCESS_TOKEN_KEY));
  }

  public setAccessToken(accessToken: string): Promise<void> {
    getLocalStorage().setItem(ACCESS_TOKEN_KEY, accessToken);
    return Promise.resolve();
  }

  public getRefreshToken(): Promise<string | null> {
    return Promise.resolve(getLocalStorage().getItem(REFRESH_TOKEN_KEY));
  }

  public setRefreshToken(refreshToken: string): Promise<void> {
    getLocalStorage().setItem(REFRESH_TOKEN_KEY, refreshToken);
    return Promise.resolve();
  }

  public clear(): Promise<void> {
    const storage = getLocalStorage();
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    return Promise.resolve();
  }
}

export const authTokenStorage: AuthTokenStorage = new WebAuthTokenStorage();
export const authStorageImplementation = 'localStorage';
