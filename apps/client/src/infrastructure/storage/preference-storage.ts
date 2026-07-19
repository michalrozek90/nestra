import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SupportedLanguage } from '@/i18n/system-language';
import type { AppearancePreference } from '@/theme/appearance-preference';

const LANGUAGE_PREFERENCE_KEY = 'nestra.preferences.language';
const APPEARANCE_PREFERENCE_KEY = 'nestra.preferences.appearance';

type PreferenceStorageArea = 'language' | 'appearance';

const preferenceStorageAvailability: Record<PreferenceStorageArea, boolean> = {
  language: false,
  appearance: false,
};

export async function readLanguagePreference(): Promise<string | null> {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  preferenceStorageAvailability.language = true;
  return storedLanguage;
}

export async function writeLanguagePreference(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
  preferenceStorageAvailability.language = true;
}

export async function readAppearancePreference(): Promise<string | null> {
  const storedPreference = await AsyncStorage.getItem(APPEARANCE_PREFERENCE_KEY);
  preferenceStorageAvailability.appearance = true;
  return storedPreference;
}

export async function writeAppearancePreference(preference: AppearancePreference): Promise<void> {
  await AsyncStorage.setItem(APPEARANCE_PREFERENCE_KEY, preference);
  preferenceStorageAvailability.appearance = true;
}

export function markPreferenceStorageUnavailable(area: PreferenceStorageArea): void {
  preferenceStorageAvailability[area] = false;
}

export function getPreferenceStorageAvailability(): boolean {
  return Object.values(preferenceStorageAvailability).every(Boolean);
}
