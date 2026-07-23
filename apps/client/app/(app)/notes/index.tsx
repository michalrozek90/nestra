import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NotesListScreen } from '@/features/notes/components/notes-list-screen';

export default function NotesScreen() {
  const { t } = useTranslation('notes');
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(false);

  return (
    <NotesListScreen
      isArchived={isArchived}
      onCreateNote={() => router.push('../notes/new')}
      onOpenNote={(noteId) => router.push({ pathname: '../notes/[noteId]', params: { noteId } })}
      onViewChange={setIsArchived}
      title={t('list.title')}
    />
  );
}
