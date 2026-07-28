import type { AuthTokenStorage } from './auth-token-storage';
import { isTauriRuntime } from './is-tauri-runtime';

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

class LazyDesktopAuthTokenStorage implements AuthTokenStorage {
  private implementationPromise: Promise<AuthTokenStorage> | undefined;

  private resolveImplementation(): Promise<AuthTokenStorage> {
    if (this.implementationPromise === undefined) {
      this.implementationPromise = import('./auth-token-storage.desktop').then(
        ({ createDesktopAuthTokenStorage }) => createDesktopAuthTokenStorage(),
      );
    }

    return this.implementationPromise;
  }

  public async getAccessToken(): Promise<string | null> {
    return (await this.resolveImplementation()).getAccessToken();
  }

  public async setAccessToken(accessToken: string): Promise<void> {
    await (await this.resolveImplementation()).setAccessToken(accessToken);
  }

  public async getRefreshToken(): Promise<string | null> {
    return (await this.resolveImplementation()).getRefreshToken();
  }

  public async setRefreshToken(refreshToken: string): Promise<void> {
    await (await this.resolveImplementation()).setRefreshToken(refreshToken);
  }

  public async clear(): Promise<void> {
    await (await this.resolveImplementation()).clear();
  }
}

const usesDesktopAuthStorage = isTauriRuntime();

export const authTokenStorage: AuthTokenStorage = usesDesktopAuthStorage
  ? new LazyDesktopAuthTokenStorage()
  : new WebAuthTokenStorage();

export const authStorageImplementation = usesDesktopAuthStorage
  ? 'OSCredentialStore'
  : 'localStorage';
