import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { Card } from './card';

type EmptyStateProps = {
  readonly title: string;
  readonly description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <View style={styles.container}>
        <Ionicons color={colors.primary} name="leaf-outline" size={34} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
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
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
});
