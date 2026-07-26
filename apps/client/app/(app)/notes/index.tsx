import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NotesListScreen } from '@/features/notes/components/notes-list-screen';

export default function NotesScreen() {
  const { t } = useTranslation('notes');
  const router = useRouter();
  const [isTrashed, setIsTrashed] = useState(false);

  return (
    <NotesListScreen
      isTrashed={isTrashed}
      onCreateNote={() => router.push('../notes/new')}
      onOpenNote={(noteId) => router.push({ pathname: '../notes/[noteId]', params: { noteId } })}
      onViewChange={setIsTrashed}
      title={t('list.title')}
    />
  );
}
