import { useTranslation } from 'react-i18next';

import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function NotesScreen() {
  const { t } = useTranslation('notes');

  return (
    <FeaturePlaceholder description={t('foundation.description')} title={t('foundation.title')} />
  );
}
