import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ApplicationUpdateHost } from '@/features/application-update/application-update-host';
import { ReleaseNoteChanges } from '@/features/releases/components/release-note-changes';
import { WhatsNewDialog } from '@/features/releases/components/whats-new-dialog';
import { formatReleaseDate } from '@/features/releases/format-release-date';
import { useWhatsNew } from '@/features/releases/use-whats-new';
import {
  isWhatsNewHistoryPath,
  shouldPersistSeenReleaseNotes,
} from '@/features/releases/whats-new-dialog-action';
import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function ProductSurfaceOverlays() {
  const { i18n, t } = useTranslation('releases');
  const router = useRouter();
  const pathname = usePathname();
  const theme = useNestraTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = getResponsiveLayout(windowWidth) === 'compact';
  const { dismiss, isReady, isVisible: isWhatsNewVisible, releaseNotes, version } = useWhatsNew();
  const isUpdatePromptSuppressed = !isReady || isWhatsNewVisible;
  const showWhatsNewDialog =
    isWhatsNewVisible && !isWhatsNewHistoryPath(pathname) && releaseNotes.length > 0 && version;

  function acknowledgeWhatsNew(): void {
    if (shouldPersistSeenReleaseNotes('acknowledge')) {
      void dismiss();
    }
  }

  function viewReleaseHistory(): void {
    if (shouldPersistSeenReleaseNotes('view-history')) {
      void dismiss();
    }

    router.push('/settings/whats-new');
  }

  return (
    <>
      {showWhatsNewDialog ? (
        <WhatsNewDialog
          dismissLabel={t('whatsNew.dismiss')}
          onDismiss={acknowledgeWhatsNew}
          onViewHistory={viewReleaseHistory}
          title={t('whatsNew.title')}
          viewHistoryLabel={t('whatsNew.viewAll')}
          visible
        >
          <View style={styles.versionList}>
            {releaseNotes.map((releaseNote) => {
              const formattedDate = formatReleaseDate(releaseNote.releaseDate, i18n.language);

              return (
                <View key={releaseNote.version} style={styles.versionBlock}>
                  <Text style={isCompact ? styles.compactVersion : styles.version}>
                    {releaseNote.version}
                  </Text>
                  {formattedDate ? (
                    <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                      {formattedDate}
                    </Text>
                  ) : null}
                  <ReleaseNoteChanges isCompact={isCompact} releaseNote={releaseNote} />
                </View>
              );
            })}
          </View>
        </WhatsNewDialog>
      ) : null}
      <ApplicationUpdateHost isSuppressed={isUpdatePromptSuppressed} />
    </>
  );
}

const styles = StyleSheet.create({
  compactVersion: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  date: {
    ...typography.supporting,
  },
  version: {
    ...typography.settingsTitle,
  },
  versionBlock: {
    gap: spacing.sm,
  },
  versionList: {
    gap: spacing.xl,
  },
});
