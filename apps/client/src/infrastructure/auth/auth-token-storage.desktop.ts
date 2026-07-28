import { invoke } from '@tauri-apps/api/core';

import type { AuthTokenStorage } from './auth-token-storage';

const ACCESS_TOKEN_ACCOUNT = 'accessToken';
const REFRESH_TOKEN_ACCOUNT = 'refreshToken';

const LEGACY_WEB_ACCESS_TOKEN_KEY = 'nestra.auth.accessToken';
const LEGACY_WEB_REFRESH_TOKEN_KEY = 'nestra.auth.refreshToken';

async function getAuthSecret(account: string): Promise<string | null> {
  if (account.length === 0) {
    throw new Error('Desktop auth secret account must not be empty.');
  }

  const secret = await invoke<string | null>('get_auth_secret', { account });
  return secret;
}

async function setAuthSecret(account: string, secret: string): Promise<void> {
  if (account.length === 0) {
    throw new Error('Desktop auth secret account must not be empty.');
  }

  if (secret.length === 0) {
    throw new Error('Desktop auth secret value must not be empty.');
  }

  await invoke('set_auth_secret', { account, secret });
}

function clearLegacyWebAuthKeys(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(LEGACY_WEB_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_WEB_REFRESH_TOKEN_KEY);
}

class DesktopAuthTokenStorage implements AuthTokenStorage {
  public getAccessToken(): Promise<string | null> {
    return getAuthSecret(ACCESS_TOKEN_ACCOUNT);
  }

  public setAccessToken(accessToken: string): Promise<void> {
    return setAuthSecret(ACCESS_TOKEN_ACCOUNT, accessToken);
  }

  public getRefreshToken(): Promise<string | null> {
    return getAuthSecret(REFRESH_TOKEN_ACCOUNT);
  }

  public setRefreshToken(refreshToken: string): Promise<void> {
    return setAuthSecret(REFRESH_TOKEN_ACCOUNT, refreshToken);
  }

  public async clear(): Promise<void> {
    await invoke('clear_auth_secrets');
    clearLegacyWebAuthKeys();
  }
}

export function createDesktopAuthTokenStorage(): AuthTokenStorage {
  clearLegacyWebAuthKeys();
  return new DesktopAuthTokenStorage();
}
