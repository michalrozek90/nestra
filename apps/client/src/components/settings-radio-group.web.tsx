import { useRef, type KeyboardEvent } from 'react';
import { View } from 'react-native';

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

const PREVIOUS_OPTION_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT_OPTION_KEYS = new Set(['ArrowDown', 'ArrowRight']);

export function SettingsRadioGroup<OptionValue extends string>({
  accessibilityLabel,
  isDisabled = false,
  onValueChange,
  options,
  selectedHint,
  value,
}: SettingsRadioGroupProps<OptionValue>) {
  const optionRefs = useRef<Array<View | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, optionIndex: number): void {
    const direction = PREVIOUS_OPTION_KEYS.has(event.key)
      ? -1
      : NEXT_OPTION_KEYS.has(event.key)
        ? 1
        : 0;

    if (direction === 0 || isDisabled || options.length === 0) {
      return;
    }

    event.preventDefault();
    const nextOptionIndex = (optionIndex + direction + options.length) % options.length;
    const nextOption = options[nextOptionIndex];

    if (!nextOption) {
      return;
    }

    onValueChange(nextOption.value);
    optionRefs.current[nextOptionIndex]?.focus();
  }

  return (
    <div
      aria-label={accessibilityLabel}
      role="radiogroup"
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}
    >
      {options.map((option, optionIndex) => {
        const isSelected = option.value === value;

        return (
          <div key={option.value} onKeyDown={(event) => handleKeyDown(event, optionIndex)}>
            <SettingsRow
              ref={(optionRef) => {
                optionRefs.current[optionIndex] = optionRef;
              }}
              accessibilityHint={isSelected ? selectedHint : undefined}
              {...(option.description ? { description: option.description } : {})}
              isDisabled={isDisabled}
              isSelected={isSelected}
              onPress={() => onValueChange(option.value)}
              tabIndex={isSelected ? 0 : -1}
              title={option.title}
            />
          </div>
        );
      })}
    </div>
  );
}
