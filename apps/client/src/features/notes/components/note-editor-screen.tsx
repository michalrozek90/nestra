import type { Note } from '@nestra/contracts';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button as PaperButton,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { getNoteErrorTranslationKey } from '../api/note-error';
import { useNoteActionMutation, type NoteAction } from '../api/use-note-action-mutation';
import { validateNoteEditorValue } from '../editor/note-editor-value';
import type { NoteSaveStatus } from '../editor/use-note-editor';
import { useNoteEditorWithFocusTransfer } from '../editor/use-note-editor-with-focus-transfer';
import { ConfirmationDialog } from './confirmation-dialog';
import { NoteActionTooltip } from './note-action-tooltip';

type NoteEditorScreenProps = {
  readonly mode: 'new' | 'existing';
  readonly note: Note | null;
};

const SAVE_STATUS_KEYS: Readonly<Record<NoteSaveStatus, string>> = {
  saving: 'editor.saving',
  saved: 'editor.saved',
  'save-failed': 'editor.saveFailed',
  'saved-locally': 'editor.savedLocally',
};

export function NoteEditorScreen({ mode, note }: NoteEditorScreenProps) {
  const { t } = useTranslation('notes');
  const router = useRouter();
  const theme = useNestraTheme();
  const { user } = useAuth();
  const [hasEditedTitle, setHasEditedTitle] = useState(false);
  const [hasEditedContent, setHasEditedContent] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const { contentFocus, editor, titleFocus } = useNoteEditorWithFocusTransfer({
    userId: user?.id ?? '',
    initialNote: note,
    mode,
    onCreated: (noteId) => router.replace({ pathname: '../notes/[noteId]', params: { noteId } }),
  });
  const validationErrors = useMemo(() => validateNoteEditorValue(editor.value), [editor.value]);
  const actionMutation = useNoteActionMutation();

  async function performNoteAction(kind: NoteAction['kind']): Promise<void> {
    if (!note) {
      return;
    }

    try {
      await editor.flush();
      await actionMutation.mutateAsync({ kind, note });

      if (kind === 'delete') {
        await editor.discard();
        setIsDeleteDialogVisible(false);
      }
      if (kind === 'delete' || kind === 'toggle-archived') {
        router.back();
      }
    } catch {
      // The mutation exposes a localized, note-content-safe error below.
    }
  }

  if (!user || !editor.isInitialized) {
    return (
      <Screen contentStyle={styles.centered}>
        <ActivityIndicator accessibilityLabel={t('editor.loading')} size="large" />
      </Screen>
    );
  }

  const titleError = hasEditedTitle ? validationErrors.title : undefined;
  const contentError = hasEditedContent ? validationErrors.content : undefined;
  const saveStatusColor =
    editor.saveStatus === 'save-failed'
      ? theme.colors.error
      : editor.saveStatus === 'saved'
        ? theme.colors.primary
        : theme.colors.onSurfaceVariant;

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel={t('actions.back')}
          icon="arrow-left"
          onPress={() => {
            void editor.flush().finally(() => router.back());
          }}
        />
        <View style={styles.header}>
          <Header title={mode === 'new' ? t('editor.newTitle') : t('editor.editTitle')} />
        </View>
        {note ? (
          <View style={styles.actions}>
            {!note.isArchived ? (
              <NoteActionTooltip title={note.isPinned ? t('actions.unpin') : t('actions.pin')}>
                <IconButton
                  accessibilityLabel={note.isPinned ? t('actions.unpin') : t('actions.pin')}
                  disabled={actionMutation.isPending}
                  icon={note.isPinned ? 'pin-off-outline' : 'pin-outline'}
                  onPress={() => void performNoteAction('toggle-pinned')}
                />
              </NoteActionTooltip>
            ) : null}
            <NoteActionTooltip
              title={note.isArchived ? t('actions.restore') : t('actions.archive')}
            >
              <IconButton
                accessibilityLabel={note.isArchived ? t('actions.restore') : t('actions.archive')}
                disabled={actionMutation.isPending}
                icon={note.isArchived ? 'archive-arrow-up-outline' : 'archive-outline'}
                onPress={() => void performNoteAction('toggle-archived')}
              />
            </NoteActionTooltip>
            <NoteActionTooltip title={t('actions.delete')}>
              <IconButton
                accessibilityLabel={t('actions.delete')}
                disabled={actionMutation.isPending}
                icon="delete-outline"
                iconColor={theme.colors.error}
                onPress={() => setIsDeleteDialogVisible(true)}
              />
            </NoteActionTooltip>
          </View>
        ) : (
          <View style={styles.actionsPlaceholder} />
        )}
      </View>

      <View style={styles.form}>
        <TextInput
          accessibilityLabel={t('editor.titleLabel')}
          autoFocus={titleFocus.autoFocus}
          error={Boolean(titleError)}
          label={t('editor.titleLabel')}
          maxLength={120}
          mode="outlined"
          onBlur={() => {
            setHasEditedTitle(true);
            titleFocus.onBlur();
          }}
          onChangeText={(title) => {
            setHasEditedTitle(true);
            editor.setTitle(title);
          }}
          onFocus={titleFocus.onFocus}
          onSelectionChange={({ nativeEvent }) => {
            titleFocus.onSelectionChange(nativeEvent.selection);
          }}
          selection={titleFocus.selection}
          value={editor.value.title}
        />
        {titleError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(titleError === 'required' ? 'editor.titleRequired' : 'editor.titleTooLong')}
          </Text>
        ) : null}

        <TextInput
          accessibilityLabel={t('editor.contentLabel')}
          autoFocus={contentFocus.autoFocus}
          error={Boolean(contentError)}
          label={t('editor.contentLabel')}
          maxLength={20_000}
          mode="outlined"
          multiline
          onBlur={() => {
            setHasEditedContent(true);
            contentFocus.onBlur();
          }}
          onChangeText={(content) => {
            setHasEditedContent(true);
            editor.setContent(content);
          }}
          onFocus={contentFocus.onFocus}
          onSelectionChange={({ nativeEvent }) => {
            contentFocus.onSelectionChange(nativeEvent.selection);
          }}
          selection={contentFocus.selection}
          style={styles.contentInput}
          value={editor.value.content}
        />
        {contentError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t('editor.contentTooLong')}
          </Text>
        ) : null}

        <Text
          accessibilityLiveRegion="polite"
          style={[styles.saveStatus, { color: saveStatusColor }]}
        >
          {t(SAVE_STATUS_KEYS[editor.saveStatus])}
        </Text>
        {actionMutation.isError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(getNoteErrorTranslationKey(actionMutation.error))}
          </Text>
        ) : null}
      </View>

      <ConfirmationDialog
        confirmLabel={t('actions.delete')}
        description={t('delete.description')}
        isConfirming={actionMutation.isPending}
        isVisible={isDeleteDialogVisible}
        onCancel={() => setIsDeleteDialogVisible(false)}
        onConfirm={() => void performNoteAction('delete')}
        title={t('delete.title')}
      />

      <ActionDialog
        description={t('draftRecovery.invalidDescription')}
        dismissable={false}
        title={t('draftRecovery.invalidTitle')}
        visible={editor.invalidRecoveredDraft !== null}
      >
        <PaperButton onPress={editor.discardInvalidRecoveredDraft}>
          {t('actions.discardDraft')}
        </PaperButton>
        <PaperButton onPress={editor.keepInvalidRecoveredDraft}>
          {t('actions.keepDraft')}
        </PaperButton>
      </ActionDialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  actionsPlaceholder: {
    width: 48,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentInput: {
    minHeight: 280,
  },
  error: {
    ...typography.supporting,
  },
  form: {
    alignSelf: 'center',
    gap: spacing.sm,
    maxWidth: 800,
    width: '100%',
  },
  header: {
    flex: 1,
  },
  saveStatus: {
    ...typography.supporting,
    textAlign: 'right',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
