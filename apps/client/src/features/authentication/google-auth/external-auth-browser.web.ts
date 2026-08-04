import * as WebBrowser from 'expo-web-browser';

import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type { ExternalAuthBrowser, ExternalAuthBrowserResult } from './google-auth.types';

const AUTH_WINDOW_NAME = 'nestra-google-auth';
const AUTH_WINDOW_FEATURES = 'popup,width=500,height=650';

class WebExternalAuthBrowser implements ExternalAuthBrowser {
  private preparedWindow: Window | null = null;

  public prepareAuthorization(): void {
    if (isTauriRuntime()) {
      return;
    }

    this.dismissPreparedAuthorization();
    this.preparedWindow = window.open('about:blank', AUTH_WINDOW_NAME, AUTH_WINDOW_FEATURES);
    if (!this.preparedWindow) {
      throw new Error('The authentication window was blocked by the browser.');
    }
  }

  public async openAuthorization(
    authorizationUrl: string,
    returnUri: string,
  ): Promise<ExternalAuthBrowserResult> {
    if (isTauriRuntime()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authorizationUrl);
      return { type: 'opened' };
    }

    const preparedWindow = this.preparedWindow;
    if (!preparedWindow || preparedWindow.closed) {
      this.preparedWindow = null;
      return { type: 'cancelled' };
    }

    try {
      const browserResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUri, {
        windowName: AUTH_WINDOW_NAME,
      });
      if (browserResult.type === 'success') {
        return { type: 'callback', callbackUrl: browserResult.url };
      }

      return { type: 'cancelled' };
    } finally {
      WebBrowser.dismissAuthSession();
      this.preparedWindow = null;
      if (preparedWindow && !preparedWindow.closed) {
        preparedWindow.close();
      }
    }
  }

  public dismissPreparedAuthorization(): void {
    if (this.preparedWindow && !this.preparedWindow.closed) {
      this.preparedWindow.close();
    }
    this.preparedWindow = null;
  }
}

export const externalAuthBrowser: ExternalAuthBrowser = new WebExternalAuthBrowser();
