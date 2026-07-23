import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text } from 'react-native-paper';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { getNoteErrorTranslationKey } from '@/features/notes/api/note-error';
import { useNoteQuery } from '@/features/notes/api/note-queries';
import { NoteEditorScreen } from '@/features/notes/components/note-editor-screen';
import { useNestraTheme } from '@/theme/themes';

const noteIdSchema = z.uuid();

export default function ExistingNoteScreen() {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();
  const parameters = useLocalSearchParams<{ noteId?: string | string[] }>();
  const parsedNoteId = noteIdSchema.safeParse(parameters.noteId);
  const noteId = parsedNoteId.success ? parsedNoteId.data : null;
  const noteQuery = useNoteQuery(noteId);

  if (!noteId) {
    return (
      <Screen>
        <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
          {t('errors.notFound')}
        </Text>
      </Screen>
    );
  }

  if (noteQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={t('editor.loading')} size="large" />
      </Screen>
    );
  }

  if (noteQuery.isError) {
    return (
      <Screen>
        <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
          {t(getNoteErrorTranslationKey(noteQuery.error))}
        </Text>
        <Button
          isLoading={noteQuery.isFetching}
          label={t('actions.retry')}
          onPress={() => void noteQuery.refetch()}
          variant="secondary"
        />
      </Screen>
    );
  }

  return <NoteEditorScreen mode="existing" note={noteQuery.data} />;
}
