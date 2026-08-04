import * as Linking from 'expo-linking';

import type { ExternalAuthCallbackSource } from './google-auth.types';

class NativeExternalAuthCallbackSource implements ExternalAuthCallbackSource {
  public getInitialCallbackUrl(): Promise<string | null> {
    return Linking.getInitialURL();
  }

  public async subscribe(listener: (callbackUrl: string) => void): Promise<() => void> {
    const subscription = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => subscription.remove();
  }
}

export const externalAuthCallbackSource: ExternalAuthCallbackSource =
  new NativeExternalAuthCallbackSource();
