import { StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/tokens';

type SectionHeaderProps = {
  readonly title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});
