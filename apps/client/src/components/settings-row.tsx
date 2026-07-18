import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, sizes, spacing } from '@/theme/tokens';

type SettingsRowProps = {
  readonly title: string;
  readonly description?: string;
  readonly onPress: () => void;
  readonly isSelected?: boolean;
  readonly accessibilityHint?: string | undefined;
};

export function SettingsRow({
  title,
  description,
  onPress,
  isSelected = false,
  accessibilityHint,
}: SettingsRowProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, isFocused && styles.focused]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Ionicons
        color={isSelected ? colors.primary : colors.textSecondary}
        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  focused: {
    borderColor: colors.focus,
    borderWidth: 2,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: sizes.minimumTouchTarget,
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
