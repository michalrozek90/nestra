import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

import type { ReleaseNote } from '../release-notes';

type ReleaseNoteChangesProps = {
  readonly isCompact?: boolean;
  readonly releaseNote: ReleaseNote;
};

export function ReleaseNoteChanges({ isCompact = false, releaseNote }: ReleaseNoteChangesProps) {
  const { t } = useTranslation('releases');
  const theme = useNestraTheme();
  const textStyle = isCompact ? styles.compactDescription : styles.description;
  const bulletStyle = isCompact ? styles.compactBullet : styles.bullet;
  const groupedChanges = [
    { changes: releaseNote.changes.new, label: t('changeTypes.new') },
    { changes: releaseNote.changes.fixes, label: t('changeTypes.fix') },
  ] as const;

  return (
    <View style={[styles.list, isCompact ? styles.compactList : null]}>
      {groupedChanges.flatMap(({ changes, label }) =>
        changes.map((change) => (
          <View key={change.descriptionTranslationKey} style={styles.row}>
            <Text style={[bulletStyle, { color: theme.colors.onSurfaceVariant }]}>•</Text>
            <Text style={textStyle}>
              <Text style={styles.changeType}>{label}: </Text>
              {t(change.descriptionTranslationKey)}
            </Text>
          </View>
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: {
    ...typography.body,
    lineHeight: typography.body.lineHeight,
    minWidth: 16,
  },
  compactBullet: {
    ...typography.supporting,
    lineHeight: typography.supporting.lineHeight,
    minWidth: 12,
  },
  compactDescription: {
    ...typography.supporting,
    flex: 1,
  },
  compactList: {
    gap: spacing.sm,
  },
  changeType: {
    fontWeight: '700',
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
