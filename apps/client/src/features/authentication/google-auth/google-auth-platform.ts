import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type { GoogleAuthPlatform } from '@nestra/contracts';

const MOBILE_RETURN_URI = 'com.michalrozek.nestra:/oauth/google';
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
      return makeRedirectUri({ native: MOBILE_RETURN_URI, path: 'oauth/google' });
  }
}
