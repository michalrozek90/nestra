import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ReleaseNoteChanges } from '@/features/releases/components/release-note-changes';
import { WhatsNewDialog, WhatsNewIntro } from '@/features/releases/components/whats-new-dialog';
import { useWhatsNew } from '@/features/releases/use-whats-new';
import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing, typography } from '@/theme/tokens';

export function WhatsNewHost() {
  const { t } = useTranslation('releases');
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = getResponsiveLayout(windowWidth) === 'compact';
  const { dismiss, isVisible, releaseNotes, version } = useWhatsNew();

  if (!isVisible || releaseNotes.length === 0 || !version) {
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
      <View style={styles.versionList}>
        {releaseNotes.map((releaseNote) => (
          <View key={releaseNote.version} style={styles.versionBlock}>
            <Text style={isCompact ? styles.compactVersion : styles.version}>
              {releaseNote.version}
            </Text>
            <ReleaseNoteChanges isCompact={isCompact} releaseNote={releaseNote} />
          </View>
        ))}
      </View>
    </WhatsNewDialog>
  );
}

const styles = StyleSheet.create({
  compactVersion: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  version: {
    ...typography.settingsTitle,
  },
  versionBlock: {
    gap: spacing.md,
  },
  versionList: {
    gap: spacing.xl,
  },
});
