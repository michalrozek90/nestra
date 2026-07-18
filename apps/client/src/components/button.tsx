import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly isDisabled?: boolean;
  readonly accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  isDisabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed),
        isFocused && styles.focused,
        isDisabled && styles.disabled,
      ]}
    >
      <Text style={variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: sizes.minimumTouchTarget,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.55,
  },
  focused: {
    borderColor: colors.focus,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryLabel: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryPressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
