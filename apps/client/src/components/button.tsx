import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

import { radii, sizes, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly isDisabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly isLoading?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  isDisabled = false,
  accessibilityLabel,
  isLoading = false,
}: ButtonProps) {
  return (
    <PaperButton
      accessibilityLabel={accessibilityLabel ?? label}
      contentStyle={styles.content}
      disabled={isDisabled || isLoading}
      labelStyle={styles.label}
      mode={variant === 'primary' ? 'contained' : 'outlined'}
      loading={isLoading}
      onPress={onPress}
      style={styles.button}
    >
      {label}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
  },
  content: {
    minHeight: sizes.minimumTouchTarget,
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
