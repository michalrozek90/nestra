import { useTranslation } from 'react-i18next';

import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function LoginScreen() {
  const { t } = useTranslation('auth');

  return <FeaturePlaceholder description={t('login.description')} title={t('login.title')} />;
}
