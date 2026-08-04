import * as WebBrowser from 'expo-web-browser';

import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type { ExternalAuthBrowser, ExternalAuthBrowserResult } from './google-auth.types';

class WebExternalAuthBrowser implements ExternalAuthBrowser {
  public async openAuthorization(
    authorizationUrl: string,
    returnUri: string,
  ): Promise<ExternalAuthBrowserResult> {
    if (isTauriRuntime()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authorizationUrl);
      return { type: 'opened' };
    }

    const browserResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUri);
    if (browserResult.type === 'success') {
      return { type: 'callback', callbackUrl: browserResult.url };
    }

    return { type: 'cancelled' };
  }
}

export const externalAuthBrowser: ExternalAuthBrowser = new WebExternalAuthBrowser();
