import * as WebBrowser from 'expo-web-browser';

import type { ExternalAuthBrowser, ExternalAuthBrowserResult } from './google-auth.types';

class ExpoExternalAuthBrowser implements ExternalAuthBrowser {
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
}

export const externalAuthBrowser: ExternalAuthBrowser = new ExpoExternalAuthBrowser();
