import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { colors, spacing } from '@/theme/tokens';

const CONTENT_MAX_WIDTH = {
  compact: undefined,
  medium: 960,
  expanded: 1200,
} as const;

export function Screen({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const responsiveLayout = getResponsiveLayout(width);

  return (
    <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <View
          style={[
            styles.content,
            CONTENT_MAX_WIDTH[responsiveLayout]
              ? { maxWidth: CONTENT_MAX_WIDTH[responsiveLayout] }
              : null,
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    padding: spacing.xl,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
});
