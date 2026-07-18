import type { ConfigContext, ExpoConfig } from 'expo/config';

import rootPackage from '../../package.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Nestra',
  slug: 'nestra',
  version: rootPackage.version,
  runtimeVersion: rootPackage.version,
  scheme: 'nestra',
  orientation: 'default',
  plugins: [
    'expo-router',
    'expo-status-bar',
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
