import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { ReleaseNoteChanges } from '@/features/releases/components/release-note-changes';
import { WhatsNewDialog, WhatsNewIntro } from '@/features/releases/components/whats-new-dialog';
import { useWhatsNew } from '@/features/releases/use-whats-new';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function WhatsNewHost() {
  const { t } = useTranslation('releases');
  const theme = useNestraTheme();
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
      <WhatsNewIntro text={t('whatsNew.intro', { version })} />
      <View style={styles.versionBlock}>
        <Text style={styles.version}>{version}</Text>
        <Text style={[styles.releaseTitle, { color: theme.colors.onSurfaceVariant }]}>
          {t(releaseNote.titleTranslationKey)}
        </Text>
      </View>
      <ReleaseNoteChanges releaseNote={releaseNote} />
    </WhatsNewDialog>
  );
}

const styles = StyleSheet.create({
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
