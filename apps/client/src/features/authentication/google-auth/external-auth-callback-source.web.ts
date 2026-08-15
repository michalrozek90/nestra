import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import { readSingleDesktopCallbackUrl } from './external-auth-callback-list';
import type { ExternalAuthCallbackSource } from './google-auth.types';

class WebExternalAuthCallbackSource implements ExternalAuthCallbackSource {
  public async getInitialCallbackUrl(): Promise<string | null> {
    if (isTauriRuntime()) {
      const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
      return readSingleDesktopCallbackUrl(await getCurrent());
    }

    return globalThis.location?.href ?? null;
  }

  public async subscribe(listener: (callbackUrl: string) => void): Promise<() => void> {
    if (!isTauriRuntime()) {
      return () => undefined;
    }

    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
    return onOpenUrl((callbackUrls) => {
      const callbackUrl = readSingleDesktopCallbackUrl(callbackUrls);
      if (callbackUrl) {
        listener(callbackUrl);
      }
    });
  }
}

export const externalAuthCallbackSource: ExternalAuthCallbackSource =
  new WebExternalAuthCallbackSource();
