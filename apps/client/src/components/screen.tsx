import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

const CONTENT_MAX_WIDTH = {
  compact: undefined,
  medium: 960,
  expanded: 1200,
} as const;

type ScreenProps = PropsWithChildren<{
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly isScrollable?: boolean;
}>;

export function Screen({
  children,
  containerStyle,
  contentStyle,
  isScrollable = true,
}: ScreenProps) {
  const { width } = useWindowDimensions();
  const responsiveLayout = getResponsiveLayout(width);
  const theme = useNestraTheme();

  const contentPadding = responsiveLayout === 'compact' ? spacing.lg : spacing.xl;

  const content = (
    <View
      style={[
        styles.content,
        contentStyle,
        CONTENT_MAX_WIDTH[responsiveLayout]
          ? { maxWidth: CONTENT_MAX_WIDTH[responsiveLayout] }
          : null,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'right', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      {isScrollable ? (
        <ScrollView
          contentContainerStyle={[styles.container, { padding: contentPadding }, containerStyle]}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.container, { padding: contentPadding }, containerStyle]}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
  },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
});
