import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import googleGLogo from '../../../../assets/google-g-logo.png';
import { useAppearance } from '@/theme/appearance-provider';
import { radii, sizes } from '@/theme/tokens';

type GoogleAuthButtonProps = {
  readonly accessibilityLabel: string;
  readonly isDisabled: boolean;
  readonly isLoading: boolean;
  readonly label: string;
  readonly onPress: () => void;
};

export function GoogleAuthButton({
  accessibilityLabel,
  isDisabled,
  isLoading,
  label,
  onPress,
}: GoogleAuthButtonProps) {
  const { resolvedAppearance } = useAppearance();
  const isDark = resolvedAppearance === 'dark';
  const backgroundColor = isDark ? '#131314' : '#FFFFFF';
  const borderColor = isDark ? '#8E918F' : '#747775';
  const textColor = isDark ? '#E3E3E3' : '#1F1F1F';
  const isUnavailable = isDisabled || isLoading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: isUnavailable }}
      disabled={isUnavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor },
        pressed ? styles.pressed : null,
        isUnavailable ? styles.disabled : null,
      ]}
    >
      <View style={styles.iconContainer}>
        {isLoading ? (
          <ActivityIndicator color={textColor} size={20} />
        ) : (
          <Image accessibilityIgnoresInvertColors source={googleGLogo} style={styles.logo} />
        )}
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.trailingSpace} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: sizes.minimumTouchTarget,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.55,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  logo: {
    height: 20,
    width: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  trailingSpace: {
    width: 20,
  },
});
