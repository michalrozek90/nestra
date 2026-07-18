import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type HeaderProps = {
  readonly title: string;
  readonly description?: string;
};

export function Header({ title, description }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
