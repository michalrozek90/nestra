import * as SecureStore from 'expo-secure-store';

import type { PendingExternalAuth, PendingExternalAuthStorage } from './google-auth.types';
import { pendingExternalAuthSchema } from './pending-external-auth-storage.schema';

const PENDING_EXTERNAL_AUTH_KEY = 'nestra.auth.google.pending';

class NativePendingExternalAuthStorage implements PendingExternalAuthStorage {
  public async read(): Promise<PendingExternalAuth | null> {
    const serializedPendingAuth = await SecureStore.getItemAsync(PENDING_EXTERNAL_AUTH_KEY);
    if (!serializedPendingAuth) {
      return null;
    }

    try {
      const parsedJson: unknown = JSON.parse(serializedPendingAuth);
      const parsedPendingAuth = pendingExternalAuthSchema.safeParse(parsedJson);
      if (parsedPendingAuth.success) {
        return parsedPendingAuth.data;
      }
    } catch {
      // Invalid stored state is cleared below and never exposed to logs.
    }

    await this.clear();
    return null;
  }

  public write(pendingAuth: PendingExternalAuth): Promise<void> {
    const validatedPendingAuth = pendingExternalAuthSchema.parse(pendingAuth);
    return SecureStore.setItemAsync(
      PENDING_EXTERNAL_AUTH_KEY,
      JSON.stringify(validatedPendingAuth),
    );
  }

  public clear(): Promise<void> {
    return SecureStore.deleteItemAsync(PENDING_EXTERNAL_AUTH_KEY);
  }
}

export const pendingExternalAuthStorage: PendingExternalAuthStorage =
  new NativePendingExternalAuthStorage();
