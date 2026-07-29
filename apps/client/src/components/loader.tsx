import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { useNestraTheme } from '@/theme/themes';

export type LoaderSize = 'small' | 'large' | number;

type LoaderProps = {
  /** Visual size of the spinner. Defaults to `large`. */
  readonly size?: LoaderSize;
  /** Spinner color. Defaults to the resolved theme primary. */
  readonly color?: string;
  /** Spoken label for assistive technologies while the spinner is active. */
  readonly accessibilityLabel?: string;
  /** When false, the spinner stops and may hide. Defaults to true. */
  readonly animating?: boolean;
  readonly style?: StyleProp<ViewStyle>;
};

/**
 * Shared brand-aligned loading spinner for full-screen and inline busy states.
 * Prefer this over ad-hoc `ActivityIndicator` usage so loading UI stays consistent.
 */
export function Loader({
  size = 'large',
  color,
  accessibilityLabel,
  animating = true,
  style,
}: LoaderProps) {
  const theme = useNestraTheme();

  return (
    <ActivityIndicator
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: animating }}
      animating={animating}
      color={color ?? theme.colors.primary}
      size={size}
      style={style}
    />
  );
}
