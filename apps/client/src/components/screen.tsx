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
  readonly contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, contentStyle }: ScreenProps) {
  const { width } = useWindowDimensions();
  const responsiveLayout = getResponsiveLayout(width);
  const theme = useNestraTheme();

  return (
    <SafeAreaView
      edges={['top', 'right', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
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
