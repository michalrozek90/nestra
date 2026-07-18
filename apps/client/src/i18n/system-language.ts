import { getLocales } from 'expo-localization';

import { enCommon } from './en/common';
import { plCommon } from './pl/common';

export const SUPPORTED_LANGUAGES = ['en', 'pl'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(language: unknown): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((supportedLanguage) => supportedLanguage === language);
}

export function getDetectedSystemLanguage(): SupportedLanguage {
  const detectedLanguage = getLocales()[0]?.languageCode;
  return isSupportedLanguage(detectedLanguage) ? detectedLanguage : DEFAULT_LANGUAGE;
}

export function getBootstrapMessages() {
  return getDetectedSystemLanguage() === 'pl' ? plCommon.initialization : enCommon.initialization;
}
