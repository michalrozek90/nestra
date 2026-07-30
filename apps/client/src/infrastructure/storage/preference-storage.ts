import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SupportedLanguage } from '@/i18n/system-language';
import type { AppearancePreference } from '@/theme/appearance-preference';

const LANGUAGE_PREFERENCE_KEY = 'nestra.preferences.language';
const APPEARANCE_PREFERENCE_KEY = 'nestra.preferences.appearance';
const LAST_SEEN_RELEASE_NOTES_VERSION_KEY = 'nestra.preferences.lastSeenReleaseNotesVersion';

type PreferenceStorageArea = 'language' | 'appearance' | 'releaseNotes';

const preferenceStorageAvailability: Record<PreferenceStorageArea, boolean> = {
  language: false,
  appearance: false,
  releaseNotes: false,
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

export async function readLastSeenReleaseNotesVersion(): Promise<string | null> {
  const storedVersion = await AsyncStorage.getItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY);
  preferenceStorageAvailability.releaseNotes = true;
  return storedVersion;
}

export async function writeLastSeenReleaseNotesVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_RELEASE_NOTES_VERSION_KEY, version);
  preferenceStorageAvailability.releaseNotes = true;
}

export function markPreferenceStorageUnavailable(area: PreferenceStorageArea): void {
  preferenceStorageAvailability[area] = false;
}

export function getPreferenceStorageAvailability(): boolean {
  return preferenceStorageAvailability.language && preferenceStorageAvailability.appearance;
}
