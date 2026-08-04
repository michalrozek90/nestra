import * as WebBrowser from 'expo-web-browser';

import type { ExternalAuthBrowser, ExternalAuthBrowserResult } from './google-auth.types';

class ExpoExternalAuthBrowser implements ExternalAuthBrowser {
  public prepareAuthorization(): void {
    // Native auth sessions are opened directly by the platform browser API.
  }

  public async openAuthorization(
    authorizationUrl: string,
    returnUri: string,
  ): Promise<ExternalAuthBrowserResult> {
    const browserResult = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUri);
    if (browserResult.type === 'success') {
      return { type: 'callback', callbackUrl: browserResult.url };
    }

    return { type: 'cancelled' };
  }

  public dismissPreparedAuthorization(): void {
    // Native auth sessions do not need a browser-window reservation.
  }
}

export const externalAuthBrowser: ExternalAuthBrowser = new ExpoExternalAuthBrowser();
