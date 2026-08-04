import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Loader } from '@/components/loader';
import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import { spacing } from '@/theme/tokens';

if (Platform.OS === 'web' && !isTauriRuntime()) {
  WebBrowser.maybeCompleteAuthSession();
}

export default function GoogleCallbackScreen() {
  const { t } = useTranslation('auth');

  return (
    <View
      accessibilityLabel={t('google.callback.accessibilityLabel')}
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <Loader />
      <Text>{t('google.callback.completing')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
