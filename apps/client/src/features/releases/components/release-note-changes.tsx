import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

import type { ReleaseNote } from '../release-notes';

type ReleaseNoteChangesProps = {
  readonly releaseNote: ReleaseNote;
};

export function ReleaseNoteChanges({ releaseNote }: ReleaseNoteChangesProps) {
  const { t } = useTranslation('releases');
  const theme = useNestraTheme();

  return (
    <View style={styles.list}>
      {releaseNote.changes.map((change) => (
        <View key={change.descriptionTranslationKey} style={styles.row}>
          <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant }]}>•</Text>
          <Text style={styles.description}>{t(change.descriptionTranslationKey)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: {
    ...typography.body,
    lineHeight: typography.body.lineHeight,
    minWidth: 16,
  },
  description: {
    ...typography.body,
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
