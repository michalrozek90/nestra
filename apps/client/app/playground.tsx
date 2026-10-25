import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/loader';
import { darkColorScheme, lightColorScheme } from '@/theme/colors';
import { radii, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

function LoaderExample({
  label,
  children,
  backgroundColor,
  textColor,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly backgroundColor: string;
  readonly textColor: string;
}) {
  return (
    <View style={[styles.example, { backgroundColor }]}>
      {children}
      <Text style={[styles.exampleLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export default function PlaygroundScreen() {
  const theme = useNestraTheme();

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            UI playground
          </Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            Local-only components and states. This route is not part of product navigation.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Counter leaf spiral loader
            </Text>
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              The selected Nestra loading mark in its supported sizes and appearances.
            </Text>
          </View>

          <View style={styles.gallery}>
            <LoaderExample
              backgroundColor={theme.colors.surface}
              label="Large · animated"
              textColor={theme.colors.onSurface}
            >
              <Loader accessibilityLabel="Large animated leaf spiral loader" size="large" />
            </LoaderExample>

            <LoaderExample
              backgroundColor={theme.colors.surface}
              label="Small · animated"
              textColor={theme.colors.onSurface}
            >
              <Loader accessibilityLabel="Small animated leaf spiral loader" size="small" />
            </LoaderExample>

            <LoaderExample
              backgroundColor={theme.colors.surface}
              label="Reduced motion · static"
              textColor={theme.colors.onSurface}
            >
              <Loader
                accessibilityLabel="Static reduced-motion leaf spiral loader"
                reduceMotion
                size="large"
              />
            </LoaderExample>

            <LoaderExample
              backgroundColor={lightColorScheme.background}
              label="Light appearance"
              textColor={lightColorScheme.onBackground}
            >
              <Loader
                accessibilityLabel="Leaf spiral loader on a light background"
                color={lightColorScheme.primary}
                size="large"
              />
            </LoaderExample>

            <LoaderExample
              backgroundColor={darkColorScheme.background}
              label="Dark appearance"
              textColor={darkColorScheme.onBackground}
            >
              <Loader
                accessibilityLabel="Leaf spiral loader on a dark background"
                color={darkColorScheme.primary}
                size="large"
              />
            </LoaderExample>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: spacing.xxl,
    maxWidth: 920,
    padding: spacing.xl,
    width: '100%',
  },
  description: {
    ...typography.body,
  },
  example: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexBasis: 180,
    flexGrow: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    minHeight: 176,
    padding: spacing.xl,
  },
  exampleLabel: {
    ...typography.supporting,
    textAlign: 'center',
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.sm,
  },
  safeArea: {
    flex: 1,
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.cardTitle,
  },
  title: {
    ...typography.screenTitle,
  },
});
