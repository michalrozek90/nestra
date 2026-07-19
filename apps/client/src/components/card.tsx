import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { radii, spacing } from '@/theme/tokens';

export function Card({ children }: PropsWithChildren) {
  return (
    <PaperCard mode="outlined" style={styles.card}>
      <PaperCard.Content style={styles.content}>{children}</PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
  },
  content: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
});
