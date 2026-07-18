import { useTranslation } from 'react-i18next';

import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function RegisterScreen() {
  const { t } = useTranslation('auth');

  return <FeaturePlaceholder description={t('register.description')} title={t('register.title')} />;
}
