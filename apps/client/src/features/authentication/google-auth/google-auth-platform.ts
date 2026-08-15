import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { runtimeConfig } from '@/config/runtime-config';
import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type { GoogleAuthPlatform } from '@nestra/contracts';

const DESKTOP_RETURN_URI = 'com.michalrozek.nestra.desktop:/oauth/google';

export function getGoogleAuthPlatform(): GoogleAuthPlatform {
  if (Platform.OS === 'web') {
    return isTauriRuntime() ? 'desktop' : 'web';
  }

  return Platform.OS === 'android' ? 'android' : 'ios';
}

export function getGoogleAuthReturnUri(platform: GoogleAuthPlatform): string {
  switch (platform) {
    case 'desktop':
      return DESKTOP_RETURN_URI;
    case 'web':
      return makeRedirectUri({ path: 'auth/google/callback' });
    case 'android':
    case 'ios':
      if (runtimeConfig.googleAuthMobileReturnUri === null) {
        throw new Error('Google authentication mobile return URI is not configured.');
      }
      return makeRedirectUri({
        native: runtimeConfig.googleAuthMobileReturnUri,
        path: 'oauth/google',
      });
  }
}
