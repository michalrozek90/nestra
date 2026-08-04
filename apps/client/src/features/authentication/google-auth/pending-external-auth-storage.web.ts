import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type { PendingExternalAuth, PendingExternalAuthStorage } from './google-auth.types';
import { pendingExternalAuthSchema } from './pending-external-auth-storage.schema';

const PENDING_EXTERNAL_AUTH_KEY = 'nestra.auth.google.pending';

class WebPendingExternalAuthStorage implements PendingExternalAuthStorage {
  public async read(): Promise<PendingExternalAuth | null> {
    const serializedPendingAuth = sessionStorage.getItem(PENDING_EXTERNAL_AUTH_KEY);
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
    sessionStorage.setItem(
      PENDING_EXTERNAL_AUTH_KEY,
      JSON.stringify(pendingExternalAuthSchema.parse(pendingAuth)),
    );
  }

  public async clear(): Promise<void> {
    sessionStorage.removeItem(PENDING_EXTERNAL_AUTH_KEY);
  }
}

class LazyDesktopPendingExternalAuthStorage implements PendingExternalAuthStorage {
  private implementationPromise: Promise<PendingExternalAuthStorage> | undefined;

  private resolveImplementation(): Promise<PendingExternalAuthStorage> {
    this.implementationPromise ??= import('./pending-external-auth-storage.desktop').then(
      ({ createDesktopPendingExternalAuthStorage }) => createDesktopPendingExternalAuthStorage(),
    );
    return this.implementationPromise;
  }

  public async read(): Promise<PendingExternalAuth | null> {
    return (await this.resolveImplementation()).read();
  }

  public async write(pendingAuth: PendingExternalAuth): Promise<void> {
    await (await this.resolveImplementation()).write(pendingAuth);
  }

  public async clear(): Promise<void> {
    await (await this.resolveImplementation()).clear();
  }
}

export const pendingExternalAuthStorage: PendingExternalAuthStorage = isTauriRuntime()
  ? new LazyDesktopPendingExternalAuthStorage()
  : new WebPendingExternalAuthStorage();
