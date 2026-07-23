import type { Note } from '@nestra/contracts';
import { StyleSheet, View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { NoteActionTooltip } from './note-action-tooltip';

type NoteCardProps = {
  readonly note: Note;
  readonly isBusy: boolean;
  readonly onOpen: () => void;
  readonly onTogglePinned: () => void;
  readonly onToggleArchived: () => void;
  readonly onDelete: () => void;
};

export function NoteCard({
  note,
  isBusy,
  onOpen,
  onTogglePinned,
  onToggleArchived,
  onDelete,
}: NoteCardProps) {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();

  return (
    <Card accessibilityLabel={note.title} mode="outlined" onPress={onOpen}>
      <Card.Content style={styles.content}>
        <View style={styles.heading}>
          <Text numberOfLines={2} style={styles.title}>
            {note.title}
          </Text>
          {note.isPinned ? (
            <Text style={[styles.pinnedLabel, { color: theme.colors.primary }]}>
              {t('list.pinned')}
            </Text>
          ) : null}
        </View>
        <Text numberOfLines={3} style={[styles.preview, { color: theme.colors.onSurfaceVariant }]}>
          {note.content}
        </Text>
        <View style={styles.actions}>
          {!note.isArchived ? (
            <NoteActionTooltip title={note.isPinned ? t('actions.unpin') : t('actions.pin')}>
              <IconButton
                accessibilityLabel={note.isPinned ? t('actions.unpin') : t('actions.pin')}
                disabled={isBusy}
                icon={note.isPinned ? 'pin-off-outline' : 'pin-outline'}
                onPress={onTogglePinned}
              />
            </NoteActionTooltip>
          ) : null}
          <NoteActionTooltip title={note.isArchived ? t('actions.restore') : t('actions.archive')}>
            <IconButton
              accessibilityLabel={note.isArchived ? t('actions.restore') : t('actions.archive')}
              disabled={isBusy}
              icon={note.isArchived ? 'archive-arrow-up-outline' : 'archive-outline'}
              onPress={onToggleArchived}
            />
          </NoteActionTooltip>
          <NoteActionTooltip title={t('actions.delete')}>
            <IconButton
              accessibilityLabel={t('actions.delete')}
              disabled={isBusy}
              icon="delete-outline"
              iconColor={theme.colors.error}
              onPress={onDelete}
            />
          </NoteActionTooltip>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  content: {
    gap: spacing.sm,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  pinnedLabel: {
    ...typography.supporting,
    fontWeight: '600',
  },
  preview: {
    ...typography.body,
  },
  title: {
    ...typography.cardTitle,
    flex: 1,
  },
});
