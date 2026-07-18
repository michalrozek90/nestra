import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SupportedLanguage } from '@/i18n/system-language';

const LANGUAGE_PREFERENCE_KEY = 'nestra.preferences.language';

let isPreferenceStorageAvailable = false;

export async function readLanguagePreference(): Promise<string | null> {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  isPreferenceStorageAvailable = true;
  return storedLanguage;
}

export async function writeLanguagePreference(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
  isPreferenceStorageAvailable = true;
}

export function markPreferenceStorageUnavailable(): void {
  isPreferenceStorageAvailable = false;
}

export function getPreferenceStorageAvailability(): boolean {
  return isPreferenceStorageAvailable;
}
