import { loadAsync } from 'expo-font';

import { logger } from '@/infrastructure/logging/logger';

const NATIVE_ICON_FONT_SOURCES = {
  ionicons: require('../../../fonts/Ionicons.ttf'),
  'material-community': require('../../../fonts/MaterialCommunityIcons.ttf'),
} as const;

/**
 * Native targets load the vendored icon fonts through expo-font's normal asset
 * pipeline. Web uses `load-icon-fonts.web.ts` instead.
 */
export async function loadIconFonts(): Promise<void> {
  try {
    await loadAsync(NATIVE_ICON_FONT_SOURCES);
  } catch (error: unknown) {
    logger.error('Icon font loading failed', error);
  }
}
