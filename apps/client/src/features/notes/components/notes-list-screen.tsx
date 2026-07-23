import type { Note } from '@nestra/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Text } from 'react-native-paper';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { getNoteErrorTranslationKey } from '../api/note-error';
import { useNotesListQuery } from '../api/note-queries';
import { useNoteActionMutation } from '../api/use-note-action-mutation';
import { ConfirmationDialog } from './confirmation-dialog';
import { NoteCard } from './note-card';

type NotesListScreenProps = {
  readonly title: string;
  readonly isArchived: boolean;
  readonly onViewChange: (isArchived: boolean) => void;
  readonly onCreateNote: () => void;
  readonly onOpenNote: (noteId: string) => void;
};

export function NotesListScreen({
  title,
  isArchived,
  onViewChange,
  onCreateNote,
  onOpenNote,
}: NotesListScreenProps) {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();
  const [pendingDeletion, setPendingDeletion] = useState<Note | null>(null);
  const notesQuery = useNotesListQuery(isArchived);
  const actionMutation = useNoteActionMutation();

  const busyNoteId = actionMutation.isPending ? actionMutation.variables.note.id : null;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Header title={title} />
        <Button label={t('actions.new')} onPress={onCreateNote} />
      </View>

      <SegmentedButtons
        buttons={[
          { value: 'active', label: t('list.active') },
          { value: 'archived', label: t('list.archived') },
        ]}
        onValueChange={(value) => onViewChange(value === 'archived')}
        value={isArchived ? 'archived' : 'active'}
      />

      {notesQuery.isPending ? (
        <View accessibilityState={{ busy: true }} style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text>{t('list.loading')}</Text>
        </View>
      ) : notesQuery.isError ? (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(getNoteErrorTranslationKey(notesQuery.error))}
          </Text>
          <Button
            isLoading={notesQuery.isFetching}
            label={t('actions.retry')}
            onPress={() => void notesQuery.refetch()}
            variant="secondary"
          />
        </View>
      ) : notesQuery.data.length === 0 ? (
        <EmptyState
          description={
            isArchived ? t('list.emptyArchivedDescription') : t('list.emptyActiveDescription')
          }
          title={isArchived ? t('list.emptyArchivedTitle') : t('list.emptyActiveTitle')}
        />
      ) : (
        <View style={styles.notes}>
          {notesQuery.data.map((note) => (
            <NoteCard
              isBusy={busyNoteId === note.id}
              key={note.id}
              note={note}
              onDelete={() => setPendingDeletion(note)}
              onOpen={() => onOpenNote(note.id)}
              onToggleArchived={() => actionMutation.mutate({ kind: 'toggle-archived', note })}
              onTogglePinned={() => actionMutation.mutate({ kind: 'toggle-pinned', note })}
            />
          ))}
        </View>
      )}

      {actionMutation.isError ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
          {t(getNoteErrorTranslationKey(actionMutation.error))}
        </Text>
      ) : null}

      <ConfirmationDialog
        confirmLabel={t('actions.delete')}
        description={t('delete.description')}
        isConfirming={actionMutation.isPending && actionMutation.variables.kind === 'delete'}
        isVisible={pendingDeletion !== null}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={() => {
          if (pendingDeletion) {
            actionMutation.mutate(
              { kind: 'delete', note: pendingDeletion },
              { onSuccess: () => setPendingDeletion(null) },
            );
          }
        }}
        title={t('delete.title')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  error: {
    ...typography.supporting,
    textAlign: 'center',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  notes: {
    gap: spacing.lg,
  },
});
