import { Appearance, useColorScheme } from 'react-native';

import type { AppearancePreference, ResolvedAppearance } from './appearance-preference';

export function useSystemAppearance(): ResolvedAppearance {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function synchronizeSystemAppearance(preference: AppearancePreference): void {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}
