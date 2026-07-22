import * as SecureStore from 'expo-secure-store';

export interface AuthTokenStorage {
  getAccessToken(): Promise<string | null>;
  setAccessToken(accessToken: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

const ACCESS_TOKEN_KEY = 'nestra.auth.accessToken';
const REFRESH_TOKEN_KEY = 'nestra.auth.refreshToken';

class SecureAuthTokenStorage implements AuthTokenStorage {
  public getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  public setAccessToken(accessToken: string): Promise<void> {
    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  }

  public getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  public setRefreshToken(refreshToken: string): Promise<void> {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  public async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }
}

export const authTokenStorage: AuthTokenStorage = new SecureAuthTokenStorage();
export const authStorageImplementation = 'SecureStore';
