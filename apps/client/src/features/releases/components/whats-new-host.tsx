import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ReleaseNoteChanges } from '@/features/releases/components/release-note-changes';
import { WhatsNewDialog, WhatsNewIntro } from '@/features/releases/components/whats-new-dialog';
import { useWhatsNew } from '@/features/releases/use-whats-new';
import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function WhatsNewHost() {
  const { t } = useTranslation('releases');
  const theme = useNestraTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = getResponsiveLayout(windowWidth) === 'compact';
  const { dismiss, isVisible, releaseNote, version } = useWhatsNew();

  if (!isVisible || !releaseNote || !version) {
    return null;
  }

  return (
    <WhatsNewDialog
      dismissLabel={t('whatsNew.dismiss')}
      onDismiss={() => {
        void dismiss();
      }}
      title={t('whatsNew.title')}
      visible={isVisible}
    >
      <WhatsNewIntro isCompact={isCompact} text={t('whatsNew.intro', { version })} />
      <View style={styles.versionBlock}>
        <Text style={isCompact ? styles.compactVersion : styles.version}>{version}</Text>
        <Text
          style={[
            isCompact ? styles.compactReleaseTitle : styles.releaseTitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t(releaseNote.titleTranslationKey)}
        </Text>
      </View>
      <ReleaseNoteChanges isCompact={isCompact} releaseNote={releaseNote} />
    </WhatsNewDialog>
  );
}

const styles = StyleSheet.create({
  compactReleaseTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  compactVersion: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  releaseTitle: {
    ...typography.supporting,
  },
  version: {
    ...typography.settingsTitle,
  },
  versionBlock: {
    gap: spacing.xs,
  },
});
