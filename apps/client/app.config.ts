import type { ConfigContext, ExpoConfig } from 'expo/config';

import rootPackage from '../../package.json';

// Expo uses this before the JavaScript theme loads; keep it aligned with lightColorScheme.background.
const APP_BOOTSTRAP_BACKGROUND_COLOR = '#f7f6f2';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Nestra',
  slug: 'nestra',
  version: rootPackage.version,
  runtimeVersion: rootPackage.version,
  scheme: 'nestra',
  orientation: 'default',
  backgroundColor: APP_BOOTSTRAP_BACKGROUND_COLOR,
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-system-ui',
    ['expo-localization', { supportedLocales: ['en', 'pl'] }],
  ],
  experiments: {
    typedRoutes: true,
  },
  android: {
    package: 'com.michalrozek.nestra',
    versionCode: 1,
  },
  ios: {
    bundleIdentifier: 'com.michalrozek.nestra',
    buildNumber: '1',
    supportsTablet: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
  },
  extra: {
    applicationVersion: rootPackage.version,
  },
});
