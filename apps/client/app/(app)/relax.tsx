import { useTranslation } from 'react-i18next';

import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function RelaxScreen() {
  const { t } = useTranslation('common');

  return (
    <FeaturePlaceholder
      description={t('placeholders.futureVersion')}
      title={t('navigation.relax')}
    />
  );
}
