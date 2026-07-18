import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  getPreferenceStorageAvailability,
  markPreferenceStorageUnavailable,
  readLanguagePreference,
  writeLanguagePreference,
} from '@/infrastructure/storage/preference-storage';
import { logger } from '@/infrastructure/logging/logger';
import { resources } from './resources';
import {
  DEFAULT_LANGUAGE,
  getDetectedSystemLanguage,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './system-language';

let initializationPromise: Promise<void> | null = null;

async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const storedLanguage = await readLanguagePreference();
    return isSupportedLanguage(storedLanguage) ? storedLanguage : getDetectedSystemLanguage();
  } catch (error: unknown) {
    markPreferenceStorageUnavailable();
    logger.error('Language preference could not be read', error);
    return getDetectedSystemLanguage();
  }
}

export function initializeLocalization(): Promise<void> {
  if (i18n.isInitialized) {
    return Promise.resolve();
  }

  initializationPromise ??= resolveInitialLanguage().then(async (initialLanguage) => {
    await i18n.use(initReactI18next).init({
      defaultNS: 'common',
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false,
      },
      lng: initialLanguage,
      react: {
        useSuspense: false,
      },
      resources,
      returnEmptyString: false,
      supportedLngs: SUPPORTED_LANGUAGES,
    });
  });

  return initializationPromise.catch((error: unknown) => {
    initializationPromise = null;
    throw error;
  });
}

export async function changeApplicationLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);

  try {
    await writeLanguagePreference(language);
  } catch (error: unknown) {
    markPreferenceStorageUnavailable();
    logger.error('Language preference could not be saved', error);
    throw error;
  }
}

export function getSelectedLanguage(): SupportedLanguage {
  return isSupportedLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE;
}

export { getPreferenceStorageAvailability, i18n };
