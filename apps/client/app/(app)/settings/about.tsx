import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { runtimeConfig } from '@/config/runtime-config';
import { ReleaseNotesHistory } from '@/features/releases/components/release-notes-history';
import { getPublishedReleaseNotesNewestFirst } from '@/features/releases/release-notes';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export default function AboutScreen() {
  const { t } = useTranslation('releases');
  const router = useRouter();
  const theme = useNestraTheme();
  const applicationVersion = runtimeConfig.applicationVersion;
  const releaseNotes = getPublishedReleaseNotesNewestFirst();

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel={t('about.actions.back')}
          icon="arrow-left"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace('/settings');
          }}
        />
        <View style={styles.titleContainer}>
          <Header title={t('about.title')} />
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.productName}>{t('about.productName')}</Text>
        <Text style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
          {t('about.versionLabel', { version: applicationVersion })}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('about.historyTitle')} />
        <Text style={[styles.historyDescription, { color: theme.colors.onSurfaceVariant }]}>
          {t('about.historyDescription')}
        </Text>
        <ReleaseNotesHistory
          initiallyExpandedVersion={applicationVersion}
          releaseNotes={releaseNotes}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  historyDescription: {
    ...typography.supporting,
  },
  productName: {
    ...typography.cardTitle,
  },
  section: {
    gap: spacing.md,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: -spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  version: {
    ...typography.body,
  },
});
