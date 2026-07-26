import { NOTE_DOCUMENT_MAX_LENGTH, type Note } from '@nestra/contracts';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { ActivityIndicator, Button as PaperButton, IconButton, Text } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Screen } from '@/components/screen';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { radii, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { validateNoteEditorValue } from '../editor/note-editor-value';
import type { NoteSaveStatus } from '../editor/use-note-editor';
import { useNoteEditorWithFocusTransfer } from '../editor/use-note-editor-with-focus-transfer';

type NoteEditorScreenProps = {
  readonly mode: 'new' | 'existing';
  readonly note: Note | null;
};

const SAVE_STATUS_KEYS = {
  saving: 'editor.saving',
  saved: 'editor.saved',
  'save-failed': 'editor.saveFailed',
  'saved-locally': 'editor.savedLocally',
} as const satisfies Record<NoteSaveStatus, string>;

export function NoteEditorScreen({ mode, note }: NoteEditorScreenProps) {
  const router = useRouter();
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();
  const { user } = useAuth();
  const [hasEditedDocument, setHasEditedDocument] = useState(false);
  const [isDocumentFocused, setIsDocumentFocused] = useState(false);
  const { documentFocus, editor } = useNoteEditorWithFocusTransfer({
    userId: user?.id ?? '',
    initialNote: note,
    mode,
    onCreated: (noteId) => router.replace({ pathname: '../notes/[noteId]', params: { noteId } }),
  });
  const validationErrors = useMemo(() => validateNoteEditorValue(editor.value), [editor.value]);

  if (!user || !editor.isInitialized) {
    return (
      <Screen contentStyle={styles.centered} isScrollable={false}>
        <ActivityIndicator accessibilityLabel={t('editor.loading')} size="large" />
      </Screen>
    );
  }

  const documentError = hasEditedDocument ? validationErrors.document : undefined;
  const saveStatusColor =
    editor.saveStatus === 'save-failed'
      ? theme.colors.error
      : editor.saveStatus === 'saved'
        ? theme.colors.primary
        : theme.colors.onSurfaceVariant;
  const errorTranslationKey =
    documentError === 'required'
      ? 'editor.documentRequired'
      : documentError === 'titleTooLong'
        ? 'editor.titleLineTooLong'
        : 'editor.documentTooLong';

  return (
    <Screen
      containerStyle={styles.screenContainer}
      contentStyle={styles.screenContent}
      isScrollable={false}
    >
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel={t('actions.back')}
          icon="arrow-left"
          onPress={() => {
            void editor.flush().finally(() => router.back());
          }}
        />
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.saveStatus, { color: saveStatusColor }]}
        >
          {t(SAVE_STATUS_KEYS[editor.saveStatus])}
        </Text>
      </View>

      <View
        style={[
          styles.documentSurface,
          { borderColor: isDocumentFocused ? theme.colors.primary : 'transparent' },
        ]}
      >
        <TextInput
          accessibilityLabel={t('editor.documentLabel')}
          autoFocus={documentFocus.autoFocus}
          maxLength={NOTE_DOCUMENT_MAX_LENGTH}
          multiline
          onBlur={() => {
            setHasEditedDocument(true);
            setIsDocumentFocused(false);
            documentFocus.onBlur();
          }}
          onChangeText={(document) => {
            setHasEditedDocument(true);
            editor.setDocument(document);
          }}
          onFocus={() => {
            setIsDocumentFocused(true);
            documentFocus.onFocus();
          }}
          onSelectionChange={({ nativeEvent }) => {
            documentFocus.onSelectionChange(nativeEvent.selection);
          }}
          placeholder={t('editor.documentPlaceholder')}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          selection={documentFocus.selection}
          selectionColor={theme.colors.primary}
          style={[styles.documentInput, { color: theme.colors.onBackground }]}
          textAlignVertical="top"
          value={editor.value.document}
        />
        {documentError ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {t(errorTranslationKey)}
          </Text>
        ) : null}
      </View>

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
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  documentInput: {
    ...typography.body,
    borderWidth: 0,
    flex: 1,
    padding: 0,
  },
  documentSurface: {
    alignSelf: 'center',
    borderRadius: radii.sm,
    borderWidth: 2,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.sm,
    width: '100%',
  },
  error: {
    ...typography.supporting,
  },
  saveStatus: {
    ...typography.supporting,
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
  },
  screenContainer: {
    padding: spacing.lg,
  },
  screenContent: {
    flex: 1,
    gap: spacing.md,
  },
  topBar: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    width: '100%',
  },
});
