import type { ConfigContext, ExpoConfig } from 'expo/config';

import rootPackage from '../../package.json';

// Expo uses this before the JavaScript theme loads; keep it aligned with lightColorScheme.background.
const APP_BOOTSTRAP_BACKGROUND_COLOR = '#f7f6f2';

function isIpAddressHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function getGoogleAuthMobileUniversalLink(): URL | null {
  if (
    process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true' ||
    process.env.EXPO_PUBLIC_APPLICATION_ENVIRONMENT === 'development'
  ) {
    return null;
  }

  const returnUri = process.env.EXPO_PUBLIC_GOOGLE_AUTH_MOBILE_RETURN_URI;
  if (returnUri === undefined) {
    return null;
  }

  const parsedReturnUri = new URL(returnUri);
  if (
    parsedReturnUri.protocol !== 'https:' ||
    parsedReturnUri.hostname.length === 0 ||
    parsedReturnUri.port.length > 0 ||
    isIpAddressHost(parsedReturnUri.hostname) ||
    ['localhost', '127.0.0.1', '[::1]'].includes(parsedReturnUri.hostname) ||
    parsedReturnUri.pathname !== '/oauth/google' ||
    parsedReturnUri.search.length > 0 ||
    parsedReturnUri.hash.length > 0 ||
    parsedReturnUri.username.length > 0 ||
    parsedReturnUri.password.length > 0
  ) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_AUTH_MOBILE_RETURN_URI must be an exact HTTPS /oauth/google URI.',
    );
  }

  return parsedReturnUri;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleAuthMobileUniversalLink = getGoogleAuthMobileUniversalLink();

  return {
    ...config,
    name: 'Nestra',
    slug: 'nestra',
    version: rootPackage.version,
    runtimeVersion: rootPackage.version,
    scheme: ['nestra', 'com.michalrozek.nestra'],
    orientation: 'default',
    backgroundColor: APP_BOOTSTRAP_BACKGROUND_COLOR,
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-status-bar',
      'expo-system-ui',
      'expo-web-browser',
      ['expo-localization', { supportedLocales: ['en', 'pl'] }],
    ],
    experiments: {
      typedRoutes: true,
    },
    android: {
      package: 'com.michalrozek.nestra',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#102B31',
      },
      ...(googleAuthMobileUniversalLink === null
        ? {}
        : {
            intentFilters: [
              {
                action: 'VIEW',
                autoVerify: true,
                category: ['BROWSABLE', 'DEFAULT'],
                data: [
                  {
                    scheme: 'https',
                    host: googleAuthMobileUniversalLink.hostname,
                    path: googleAuthMobileUniversalLink.pathname,
                  },
                ],
              },
            ],
          }),
    },
    ios: {
      bundleIdentifier: 'com.michalrozek.nestra',
      buildNumber: '1',
      supportsTablet: true,
      ...(googleAuthMobileUniversalLink === null
        ? {}
        : { associatedDomains: [`applinks:${googleAuthMobileUniversalLink.hostname}`] }),
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    extra: {
      applicationVersion: rootPackage.version,
    },
  };
};
