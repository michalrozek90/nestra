import type { Note } from '@nestra/contracts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Header } from '@/components/header';
import { Loader } from '@/components/loader';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { getNoteErrorTranslationKey } from '../api/note-error';
import { useNotesListQuery } from '../api/note-queries';
import { useEmptyTrashMutation } from '../api/use-empty-trash-mutation';
import { useNoteActionMutation } from '../api/use-note-action-mutation';
import { ConfirmationDialog } from './confirmation-dialog';
import { NoteCard } from './note-card';

type NotesListScreenProps = {
  readonly title: string;
  readonly isTrashed: boolean;
  readonly onViewChange: (isTrashed: boolean) => void;
  readonly onCreateNote: () => void;
  readonly onOpenNote: (noteId: string) => void;
};

export function NotesListScreen({
  title,
  isTrashed,
  onViewChange,
  onCreateNote,
  onOpenNote,
}: NotesListScreenProps) {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();
  const [pendingPermanentDeletion, setPendingPermanentDeletion] = useState<Note | null>(null);
  const [isEmptyTrashDialogVisible, setIsEmptyTrashDialogVisible] = useState(false);
  const notesQuery = useNotesListQuery(isTrashed);
  const actionMutation = useNoteActionMutation();
  const emptyTrashMutation = useEmptyTrashMutation();

  const busyNoteId = actionMutation.isPending ? actionMutation.variables.note.id : null;
  const actionErrorNoteId =
    actionMutation.isError && actionMutation.variables.kind !== 'delete-permanently'
      ? actionMutation.variables.note.id
      : null;
  const isPendingPermanentDeletion =
    actionMutation.isPending &&
    actionMutation.variables.kind === 'delete-permanently' &&
    actionMutation.variables.note.id === pendingPermanentDeletion?.id;
  const permanentDeletionError =
    actionMutation.isError &&
    actionMutation.variables.kind === 'delete-permanently' &&
    actionMutation.variables.note.id === pendingPermanentDeletion?.id
      ? actionMutation.error
      : null;
  const hasTrashedNotes = isTrashed && notesQuery.isSuccess && notesQuery.data.length > 0;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Header title={title} />
        <View style={styles.headerActions}>
          {hasTrashedNotes ? (
            <Button
              isDisabled={actionMutation.isPending}
              isLoading={emptyTrashMutation.isPending}
              label={t('actions.emptyTrash')}
              onPress={() => setIsEmptyTrashDialogVisible(true)}
              variant="destructive"
            />
          ) : null}
          <Button label={t('actions.new')} onPress={onCreateNote} />
        </View>
      </View>

      {emptyTrashMutation.isError ? (
        <View style={styles.trashFeedback}>
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(getNoteErrorTranslationKey(emptyTrashMutation.error))}
          </Text>
          <Button
            label={t('actions.retryEmptyTrash')}
            onPress={() => setIsEmptyTrashDialogVisible(true)}
            variant="destructive"
          />
        </View>
      ) : emptyTrashMutation.isSuccess ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.success, { color: theme.colors.primary }]}
        >
          {t('emptyTrash.success', { count: emptyTrashMutation.data.deletedNotesCount })}
        </Text>
      ) : null}

      <SegmentedButtons
        buttons={[
          { value: 'active', label: t('list.active') },
          { value: 'trash', label: t('list.trash') },
        ]}
        onValueChange={(value) => {
          setPendingPermanentDeletion(null);
          setIsEmptyTrashDialogVisible(false);
          actionMutation.reset();
          emptyTrashMutation.reset();
          onViewChange(value === 'trash');
        }}
        value={isTrashed ? 'trash' : 'active'}
      />

      {notesQuery.isPending ? (
        <View accessibilityState={{ busy: true }} style={styles.centered}>
          <Loader accessibilityLabel={t('list.loading')} />
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
            isTrashed ? t('list.emptyTrashDescription') : t('list.emptyActiveDescription')
          }
          title={isTrashed ? t('list.emptyTrashTitle') : t('list.emptyActiveTitle')}
        />
      ) : (
        <View style={styles.notes}>
          {notesQuery.data.map((note) => (
            <NoteCard
              {...(actionErrorNoteId === note.id
                ? { errorMessage: t(getNoteErrorTranslationKey(actionMutation.error)) }
                : {})}
              isBusy={busyNoteId === note.id || emptyTrashMutation.isPending}
              key={note.id}
              note={note}
              onDeletePermanently={() => setPendingPermanentDeletion(note)}
              onMoveToTrash={() => actionMutation.mutate({ kind: 'move-to-trash', note })}
              onOpen={() => onOpenNote(note.id)}
              onRestore={() => actionMutation.mutate({ kind: 'restore', note })}
              onTogglePinned={() => actionMutation.mutate({ kind: 'toggle-pinned', note })}
            />
          ))}
        </View>
      )}

      <ConfirmationDialog
        confirmLabel={t('actions.deletePermanently')}
        description={t('permanentDelete.description')}
        {...(permanentDeletionError
          ? { errorMessage: t(getNoteErrorTranslationKey(permanentDeletionError)) }
          : {})}
        isConfirming={isPendingPermanentDeletion}
        isVisible={pendingPermanentDeletion !== null}
        onCancel={() => setPendingPermanentDeletion(null)}
        onConfirm={() => {
          if (pendingPermanentDeletion) {
            actionMutation.mutate(
              { kind: 'delete-permanently', note: pendingPermanentDeletion },
              { onSuccess: () => setPendingPermanentDeletion(null) },
            );
          }
        }}
        title={t('permanentDelete.title')}
      />

      <ConfirmationDialog
        confirmLabel={t('actions.emptyTrash')}
        description={t('emptyTrash.description')}
        {...(emptyTrashMutation.isError
          ? { errorMessage: t(getNoteErrorTranslationKey(emptyTrashMutation.error)) }
          : {})}
        isConfirming={emptyTrashMutation.isPending}
        isVisible={isEmptyTrashDialogVisible}
        onCancel={() => setIsEmptyTrashDialogVisible(false)}
        onConfirm={() => {
          emptyTrashMutation.mutate(undefined, {
            onSuccess: () => setIsEmptyTrashDialogVisible(false),
          });
        }}
        title={t('emptyTrash.title')}
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
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  notes: {
    gap: spacing.lg,
  },
  success: {
    ...typography.supporting,
    textAlign: 'center',
  },
  trashFeedback: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
