import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

import type { ReleaseChangeCategory, ReleaseNote } from '../release-notes';

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
          <Text style={[styles.category, { color: theme.colors.onSurfaceVariant }]}>
            {t(getCategoryTranslationKey(change.category))}
          </Text>
          <Text style={styles.description}>{t(change.descriptionTranslationKey)}</Text>
        </View>
      ))}
    </View>
  );
}

function getCategoryTranslationKey(category: ReleaseChangeCategory): string {
  switch (category) {
    case 'added':
      return 'categories.added';
    case 'changed':
      return 'categories.changed';
    case 'fixed':
      return 'categories.fixed';
    case 'removed':
      return 'categories.removed';
  }
}

const styles = StyleSheet.create({
  category: {
    ...typography.supporting,
    fontWeight: '600',
  },
  description: {
    ...typography.body,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
});
