import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { Card } from './card';

type EmptyStateProps = {
  readonly title: string;
  readonly description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  const theme = useNestraTheme();

  return (
    <Card>
      <View style={styles.container}>
        <Ionicons color={theme.colors.primary} name="leaf-outline" size={34} />
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>
          {title}
        </Text>
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  description: {
    ...typography.body,
    maxWidth: 520,
    textAlign: 'center',
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'center',
  },
});
