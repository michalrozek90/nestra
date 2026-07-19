import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

type SectionHeaderProps = {
  readonly title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  const theme = useNestraTheme();

  return (
    <Text
      accessibilityRole="header"
      aria-level={2}
      style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.sectionTitle,
    textTransform: 'uppercase',
  },
});
