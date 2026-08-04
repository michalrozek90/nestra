import { invoke } from '@tauri-apps/api/core';

import type { PendingExternalAuth, PendingExternalAuthStorage } from './google-auth.types';
import { pendingExternalAuthSchema } from './pending-external-auth-storage.schema';

const PENDING_EXTERNAL_AUTH_ACCOUNT = 'pendingExternalAuth';

class DesktopPendingExternalAuthStorage implements PendingExternalAuthStorage {
  public async read(): Promise<PendingExternalAuth | null> {
    const serializedPendingAuth = await invoke<string | null>('get_auth_secret', {
      account: PENDING_EXTERNAL_AUTH_ACCOUNT,
    });
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

  public async write(pendingAuth: PendingExternalAuth): Promise<void> {
    const validatedPendingAuth = pendingExternalAuthSchema.parse(pendingAuth);
    await invoke('set_auth_secret', {
      account: PENDING_EXTERNAL_AUTH_ACCOUNT,
      secret: JSON.stringify(validatedPendingAuth),
    });
  }

  public async clear(): Promise<void> {
    await invoke('delete_auth_secret', { account: PENDING_EXTERNAL_AUTH_ACCOUNT });
  }
}

export function createDesktopPendingExternalAuthStorage(): PendingExternalAuthStorage {
  return new DesktopPendingExternalAuthStorage();
}
