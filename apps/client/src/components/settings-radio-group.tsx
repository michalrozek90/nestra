import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { SettingsRow } from './settings-row';

type SettingsRadioOption<OptionValue extends string> = {
  readonly value: OptionValue;
  readonly title: string;
  readonly description?: string | undefined;
};

type SettingsRadioGroupProps<OptionValue extends string> = {
  readonly accessibilityLabel: string;
  readonly isDisabled?: boolean | undefined;
  readonly onValueChange: (value: OptionValue) => void;
  readonly options: readonly SettingsRadioOption<OptionValue>[];
  readonly selectedHint: string;
  readonly value: OptionValue;
};

export function SettingsRadioGroup<OptionValue extends string>({
  accessibilityLabel,
  isDisabled = false,
  onValueChange,
  options,
  selectedHint,
  value,
}: SettingsRadioGroupProps<OptionValue>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={styles.group}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <SettingsRow
            accessibilityHint={isSelected ? selectedHint : undefined}
            {...(option.description ? { description: option.description } : {})}
            isDisabled={isDisabled}
            isSelected={isSelected}
            key={option.value}
            onPress={() => onValueChange(option.value)}
            tabIndex={isSelected ? 0 : -1}
            title={option.title}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
  },
});
