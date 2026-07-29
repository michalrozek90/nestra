import { NOTE_DOCUMENT_MAX_LENGTH, type Note } from '@nestra/contracts';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button as PaperButton, IconButton, Text } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Loader } from '@/components/loader';
import { Screen } from '@/components/screen';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { validateNoteEditorValue } from '../editor/note-editor-value';
import { useNoteEditorWithFocusTransfer } from '../editor/use-note-editor-with-focus-transfer';
import { NoteDocumentInput } from './note-document-input';

type NoteEditorScreenProps = {
  readonly mode: 'new' | 'existing';
  readonly note: Note | null;
};

export function NoteEditorScreen({ mode, note }: NoteEditorScreenProps) {
  const router = useRouter();
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();
  const { user } = useAuth();
  const [hasEditedDocument, setHasEditedDocument] = useState(false);
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
        <Loader accessibilityLabel={t('editor.loading')} />
      </Screen>
    );
  }

  const documentError = hasEditedDocument ? validationErrors.document : undefined;
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
        {editor.saveStatus === 'save-failed' ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={[styles.saveError, { color: theme.colors.error }]}
          >
            {t('editor.saveFailed')}
          </Text>
        ) : null}
      </View>

      <View style={styles.documentSurface}>
        <NoteDocumentInput
          accessibilityLabel={t('editor.documentLabel')}
          autoFocus={documentFocus.autoFocus}
          maxLength={NOTE_DOCUMENT_MAX_LENGTH}
          onBlur={() => {
            setHasEditedDocument(true);
            documentFocus.onBlur();
          }}
          onChangeText={(document) => {
            setHasEditedDocument(true);
            editor.setDocument(document);
          }}
          onFocus={documentFocus.onFocus}
          onSelectionChange={documentFocus.onSelectionChange}
          placeholder={t('editor.documentPlaceholder')}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          selection={documentFocus.selection}
          selectionColor={theme.colors.primary}
          textColor={theme.colors.onBackground}
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
  documentSurface: {
    alignSelf: 'center',
    flex: 1,
    gap: spacing.sm,
    padding: spacing.sm,
    width: '100%',
  },
  error: {
    ...typography.supporting,
  },
  saveError: {
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
