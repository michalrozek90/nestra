import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

type HeaderProps = {
  readonly title: string;
  readonly description?: string;
};

export function Header({ title, description }: HeaderProps) {
  const theme = useNestraTheme();

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  description: {
    ...typography.body,
  },
  title: {
    ...typography.screenTitle,
  },
});
