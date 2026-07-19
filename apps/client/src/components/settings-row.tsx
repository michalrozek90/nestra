import { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';

import { radii, sizes, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

type SettingsRowProps = {
  readonly title: string;
  readonly description?: string;
  readonly onPress: () => void;
  readonly isSelected?: boolean | undefined;
  readonly isDisabled?: boolean | undefined;
  readonly accessibilityHint?: string | undefined;
  readonly tabIndex?: 0 | -1 | undefined;
};

export const SettingsRow = forwardRef<View, SettingsRowProps>(function SettingsRow(
  { title, description, onPress, isSelected, isDisabled = false, accessibilityHint, tabIndex },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const theme = useNestraTheme();
  const isSelection = isSelected !== undefined;

  return (
    <Surface
      elevation={0}
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isFocused ? theme.colors.primary : theme.colors.outlineVariant,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
    >
      <TouchableRipple
        ref={ref}
        accessibilityHint={accessibilityHint}
        accessibilityRole={isSelection ? 'radio' : 'button'}
        accessibilityState={
          isSelection ? { checked: isSelected, disabled: isDisabled } : { disabled: isDisabled }
        }
        aria-checked={isSelection ? isSelected : undefined}
        borderless
        disabled={isDisabled}
        onBlur={() => setIsFocused(false)}
        onFocus={() => setIsFocused(true)}
        onPress={onPress}
        style={styles.ripple}
        tabIndex={tabIndex}
      >
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {description ? (
              <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                {description}
              </Text>
            ) : null}
          </View>
          <Icon
            color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
            size={24}
            source={
              isSelection ? (isSelected ? 'radiobox-marked' : 'radiobox-blank') : 'chevron-right'
            }
          />
        </View>
      </TouchableRipple>
    </Surface>
  );
});

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    ...typography.supporting,
  },
  ripple: {
    borderRadius: radii.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: sizes.minimumTouchTarget,
    padding: spacing.lg,
  },
  surface: {
    borderRadius: radii.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  title: {
    ...typography.settingsTitle,
  },
});
