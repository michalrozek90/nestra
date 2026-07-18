import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { initializeLocalization } from '@/i18n/i18n';
import { getBootstrapMessages } from '@/i18n/system-language';
import { logger } from '@/infrastructure/logging/logger';
import { colors, spacing } from '@/theme/tokens';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type InitializationStatus = 'loading' | 'ready' | 'failed';

export default function RootLayout() {
  const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('loading');
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void initializeLocalization()
      .then(() => {
        if (isMounted) {
          setInitializationStatus('ready');
        }
      })
      .catch((error: unknown) => {
        logger.error('Client localization initialization failed', error);
        if (isMounted) {
          setInitializationStatus('failed');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initializationAttempt]);

  if (initializationStatus === 'loading') {
    return (
      <View
        accessibilityLabel="Nestra"
        accessibilityState={{ busy: true }}
        style={styles.initializationContainer}
      >
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (initializationStatus === 'failed') {
    const messages = getBootstrapMessages();

    return (
      <View style={styles.initializationContainer}>
        <StatusBar style="dark" />
        <Text accessibilityRole="header" style={styles.initializationTitle}>
          {messages.failed}
        </Text>
        <Button
          label={messages.retry}
          onPress={() => {
            setInitializationStatus('loading');
            setInitializationAttempt((attempt) => attempt + 1);
          }}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  initializationContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  initializationTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
