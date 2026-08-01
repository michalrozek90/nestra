import type { TFunction } from 'i18next';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { Header } from '@/components/header';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { runtimeConfig } from '@/config/runtime-config';
import { useApplicationUpdate } from '@/features/application-update/application-update-provider';
import type { ApplicationUpdateState } from '@/features/application-update/application-update.types';
import { ReleaseNotesHistory } from '@/features/releases/components/release-notes-history';
import { getReleaseNotesNewestFirst } from '@/features/releases/release-notes';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

function getUpdateStatusText(
  state: ApplicationUpdateState,
  translate: TFunction<'releases'>,
): string {
  switch (state.status) {
    case 'unsupported':
      return '';
    case 'idle':
      return translate('update.status.idle');
    case 'checking':
      return translate('update.status.checking');
    case 'up-to-date':
      return translate('update.status.upToDate');
    case 'available':
      return state.notes
        ? translate('update.status.availableWithNotes', {
            version: state.version,
            notes: state.notes,
          })
        : translate('update.status.available', { version: state.version });
    case 'downloading': {
      const progressPercent = state.totalBytes
        ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100))
        : undefined;
      return progressPercent === undefined
        ? translate('update.downloading')
        : translate('update.downloadingProgress', { progressPercent });
    }
    case 'installing':
      return translate('update.installing');
    case 'restart-required':
      return translate('update.restartRequired');
    case 'recoverable-error':
      return translate(`update.errors.${state.code}`);
  }
}

export default function AboutScreen() {
  const { t } = useTranslation('releases');
  const router = useRouter();
  const theme = useNestraTheme();
  const applicationVersion = runtimeConfig.applicationVersion;
  const releaseNotes = getReleaseNotesNewestFirst(applicationVersion);
  const { state, checkForUpdate, installAvailableUpdate } = useApplicationUpdate();
  const isUpdateOperationActive =
    state.status === 'checking' || state.status === 'downloading' || state.status === 'installing';
  const canInstallUpdate =
    state.status === 'available' ||
    state.status === 'restart-required' ||
    (state.status === 'recoverable-error' && state.version !== undefined);

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

      {state.status !== 'unsupported' ? (
        <View style={styles.section}>
          <SectionHeader title={t('update.settingsTitle')} />
          <Text style={[styles.historyDescription, { color: theme.colors.onSurfaceVariant }]}>
            {getUpdateStatusText(state, t)}
          </Text>
          <View style={styles.updateActions}>
            <Button
              isLoading={state.status === 'checking'}
              isDisabled={isUpdateOperationActive}
              label={t('update.actions.check')}
              onPress={() => void checkForUpdate()}
              variant="secondary"
            />
            {canInstallUpdate ? (
              <Button
                label={
                  state.status === 'restart-required'
                    ? t('update.actions.restart')
                    : t('update.actions.install')
                }
                onPress={() => void installAvailableUpdate()}
              />
            ) : null}
          </View>
        </View>
      ) : null}

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
  updateActions: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  version: {
    ...typography.body,
  },
});
