import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SettingsRow } from '@/components/settings-row';
import { runtimeConfig } from '@/config/runtime-config';
import { changeApplicationLanguage, getSelectedLanguage } from '@/i18n/i18n';
import type { SupportedLanguage } from '@/i18n/system-language';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation('settings');
  const router = useRouter();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [hasLanguageSaveError, setHasLanguageSaveError] = useState(false);
  const selectedLanguage = getSelectedLanguage();

  async function selectLanguage(language: SupportedLanguage): Promise<void> {
    if (language === selectedLanguage || isChangingLanguage) {
      return;
    }

    setIsChangingLanguage(true);
    setHasLanguageSaveError(false);

    try {
      await changeApplicationLanguage(language);
    } catch {
      setHasLanguageSaveError(true);
    } finally {
      setIsChangingLanguage(false);
    }
  }

  return (
    <Screen>
      <Header title={t('title')} />

      <View style={styles.section}>
        <SectionHeader title={t('sections.language')} />
        <SettingsRow
          accessibilityHint={selectedLanguage === 'en' ? t('language.selected') : undefined}
          isSelected={selectedLanguage === 'en'}
          onPress={() => void selectLanguage('en')}
          title={t('language.english')}
        />
        <SettingsRow
          accessibilityHint={selectedLanguage === 'pl' ? t('language.selected') : undefined}
          isSelected={selectedLanguage === 'pl'}
          onPress={() => void selectLanguage('pl')}
          title={t('language.polish')}
        />
        {hasLanguageSaveError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {t('language.saveFailed')}
          </Text>
        ) : null}
      </View>

      {runtimeConfig.showDeveloperDiagnostics ? (
        <View style={styles.section}>
          <SectionHeader title={t('sections.developer')} />
          <SettingsRow
            description={t('diagnostics.entryDescription')}
            onPress={() => router.push('/settings/developer-diagnostics')}
            title={t('diagnostics.entryTitle')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
  },
});
