import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { Button } from '@/components/button';
import { initializeLocalization } from '@/i18n/i18n';
import { getBootstrapMessages } from '@/i18n/system-language';
import { logger } from '@/infrastructure/logging/logger';
import { AppearanceProvider, useAppearance } from '@/theme/appearance-provider';
import { spacing } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

type InitializationStatus = 'loading' | 'ready' | 'failed';

function RootNavigator() {
  const theme = useNestraTheme();
  const { isInitialized: isAppearanceInitialized } = useAppearance();
  const [localizationStatus, setLocalizationStatus] = useState<InitializationStatus>('loading');
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void initializeLocalization()
      .then(() => {
        if (isMounted) {
          setLocalizationStatus('ready');
        }
      })
      .catch((error: unknown) => {
        logger.error('Client localization initialization failed', error);
        if (isMounted) {
          setLocalizationStatus('failed');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initializationAttempt]);

  if (localizationStatus === 'loading' || !isAppearanceInitialized) {
    return (
      <View
        accessibilityLabel="Nestra"
        accessibilityState={{ busy: true }}
        style={[styles.initializationContainer, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (localizationStatus === 'failed') {
    const messages = getBootstrapMessages();

    return (
      <View style={[styles.initializationContainer, { backgroundColor: theme.colors.background }]}>
        <Text accessibilityRole="header" style={styles.initializationTitle}>
          {messages.failed}
        </Text>
        <Button
          label={messages.retry}
          onPress={() => {
            setLocalizationStatus('loading');
            setInitializationAttempt((attempt) => attempt + 1);
          }}
        />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <RootNavigator />
    </AppearanceProvider>
  );
}

const styles = StyleSheet.create({
  initializationContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  initializationTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
