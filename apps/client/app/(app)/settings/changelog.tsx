import { useTranslation } from 'react-i18next';

import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function ChangelogScreen() {
  const { t } = useTranslation('releases');

  return (
    <FeaturePlaceholder description={t('changelog.description')} title={t('changelog.title')} />
  );
}
