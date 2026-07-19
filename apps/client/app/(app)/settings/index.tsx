import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SettingsRadioGroup } from '@/components/settings-radio-group';
import { SettingsRow } from '@/components/settings-row';
import { runtimeConfig } from '@/config/runtime-config';
import { changeApplicationLanguage, getSelectedLanguage } from '@/i18n/i18n';
import type { SupportedLanguage } from '@/i18n/system-language';
import { useAppearance } from '@/theme/appearance-provider';
import type { AppearancePreference } from '@/theme/appearance-preference';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export default function SettingsScreen() {
  const { t } = useTranslation('settings');
  const router = useRouter();
  const theme = useNestraTheme();
  const { preference: appearancePreference, changePreference } = useAppearance();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [hasLanguageSaveError, setHasLanguageSaveError] = useState(false);
  const [isChangingAppearance, setIsChangingAppearance] = useState(false);
  const [hasAppearanceSaveError, setHasAppearanceSaveError] = useState(false);
  const selectedLanguage = getSelectedLanguage();

  async function selectLanguage(language: SupportedLanguage): Promise<void> {
    if ((language === selectedLanguage && !hasLanguageSaveError) || isChangingLanguage) {
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

  async function selectAppearance(preference: AppearancePreference): Promise<void> {
    if (preference === appearancePreference || isChangingAppearance) {
      return;
    }

    setIsChangingAppearance(true);
    setHasAppearanceSaveError(false);

    try {
      await changePreference(preference);
    } catch {
      setHasAppearanceSaveError(true);
    } finally {
      setIsChangingAppearance(false);
    }
  }

  return (
    <Screen>
      <Header title={t('title')} />

      <View style={styles.section}>
        <SectionHeader title={t('sections.language')} />
        <SettingsRadioGroup
          accessibilityLabel={t('sections.language')}
          isDisabled={isChangingLanguage}
          onValueChange={(language) => void selectLanguage(language)}
          options={[
            { value: 'en', title: t('language.english') },
            { value: 'pl', title: t('language.polish') },
          ]}
          selectedHint={t('language.selected')}
          value={selectedLanguage}
        />
        {hasLanguageSaveError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('language.saveFailed')}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('sections.appearance')} />
        <SettingsRadioGroup
          accessibilityLabel={t('sections.appearance')}
          isDisabled={isChangingAppearance}
          onValueChange={(preference) => void selectAppearance(preference)}
          options={[
            {
              value: 'system',
              title: t('appearance.system'),
              description: t('appearance.systemDescription'),
            },
            { value: 'light', title: t('appearance.light') },
            { value: 'dark', title: t('appearance.dark') },
          ]}
          selectedHint={t('appearance.selected')}
          value={appearancePreference}
        />
        {hasAppearanceSaveError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('appearance.saveFailed')}
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
    ...typography.supporting,
  },
  section: {
    gap: spacing.md,
  },
});
