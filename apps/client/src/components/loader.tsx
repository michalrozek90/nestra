import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { logger } from '@/infrastructure/logging/logger';
import { useNestraTheme } from '@/theme/themes';

type LoaderSize = 'small' | 'large' | number;

type LoaderProps = {
  /** Visual size of the nest mark. Defaults to `large`. */
  readonly size?: LoaderSize;
  /** Leaf color override. Defaults to a palette from the active theme. */
  readonly color?: string;
  /** Spoken label for assistive technologies while the loader is active. */
  readonly accessibilityLabel?: string;
  /** When false, the mark remains visible but stops moving. Defaults to true. */
  readonly animating?: boolean;
  /** Forces the reduced-motion presentation without overriding the system preference. */
  readonly reduceMotion?: boolean;
  readonly style?: StyleProp<ViewStyle>;
};

type LeafDefinition = {
  readonly id: string;
  readonly colorRole: 'primary' | 'secondary' | 'tertiary';
  readonly leftRatio: number;
  readonly topRatio: number;
  readonly restingRotationDegrees: number;
  readonly entryRotationOffsetDegrees: number;
  readonly entryOffsetRatio: number;
  readonly startDelayMs: number;
  readonly weaveDurationMs: number;
  readonly holdDurationMs: number;
  readonly releaseDurationMs: number;
};

const LOADER_SIZE_PX = {
  small: 28,
  large: 56,
} as const;

const LEAF_WIDTH_RATIO = 0.57;
const LEAF_HEIGHT_RATIO = 0.19;

const LEAVES: readonly LeafDefinition[] = [
  {
    id: 'upper-left',
    colorRole: 'primary',
    leftRatio: 0.08,
    topRatio: 0.2,
    restingRotationDegrees: -24,
    entryRotationOffsetDegrees: -10,
    entryOffsetRatio: -0.09,
    startDelayMs: 0,
    weaveDurationMs: 480,
    holdDurationMs: 520,
    releaseDurationMs: 430,
  },
  {
    id: 'upper-right',
    colorRole: 'tertiary',
    leftRatio: 0.35,
    topRatio: 0.16,
    restingRotationDegrees: 29,
    entryRotationOffsetDegrees: 12,
    entryOffsetRatio: -0.07,
    startDelayMs: 230,
    weaveDurationMs: 560,
    holdDurationMs: 470,
    releaseDurationMs: 520,
  },
  {
    id: 'lower-left',
    colorRole: 'secondary',
    leftRatio: 0.06,
    topRatio: 0.51,
    restingRotationDegrees: 20,
    entryRotationOffsetDegrees: -13,
    entryOffsetRatio: 0.08,
    startDelayMs: 410,
    weaveDurationMs: 510,
    holdDurationMs: 610,
    releaseDurationMs: 470,
  },
  {
    id: 'lower-right',
    colorRole: 'primary',
    leftRatio: 0.36,
    topRatio: 0.54,
    restingRotationDegrees: -27,
    entryRotationOffsetDegrees: 11,
    entryOffsetRatio: 0.09,
    startDelayMs: 640,
    weaveDurationMs: 600,
    holdDurationMs: 440,
    releaseDurationMs: 560,
  },
] as const;

function resolveLoaderSizePx(size: LoaderSize): number {
  return typeof size === 'number' ? size : LOADER_SIZE_PX[size];
}

function useShouldReduceMotion(forceReduceMotion: boolean): boolean {
  const [isSystemReducedMotionEnabled, setIsSystemReducedMotionEnabled] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted) {
          setIsSystemReducedMotionEnabled(isEnabled);
        }
      })
      .catch((error: unknown) => {
        logger.error('Reduced-motion preference could not be read', error);
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsSystemReducedMotionEnabled,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Stay static until the preference is known so reduced-motion users never see an initial burst.
  return forceReduceMotion || isSystemReducedMotionEnabled !== false;
}

function NestLeaf({
  color,
  definition,
  shouldAnimate,
  sizePx,
}: {
  readonly color: string;
  readonly definition: LeafDefinition;
  readonly shouldAnimate: boolean;
  readonly sizePx: number;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const leafWidthPx = sizePx * LEAF_WIDTH_RATIO;
  const leafHeightPx = sizePx * LEAF_HEIGHT_RATIO;
  const restingRotationDegrees = definition.restingRotationDegrees;

  useEffect(() => {
    if (!shouldAnimate) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(definition.startDelayMs),
        Animated.timing(progress, {
          duration: definition.weaveDurationMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.delay(definition.holdDurationMs),
        Animated.timing(progress, {
          duration: definition.releaseDurationMs,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [definition, progress, shouldAnimate]);

  return (
    <Animated.View
      style={[
        styles.leaf,
        {
          backgroundColor: color,
          borderBottomLeftRadius: leafHeightPx * 0.35,
          borderBottomRightRadius: leafHeightPx,
          borderTopLeftRadius: leafHeightPx,
          borderTopRightRadius: leafHeightPx * 0.35,
          height: leafHeightPx,
          left: sizePx * definition.leftRatio,
          opacity: progress.interpolate({
            inputRange: [0, 0.72, 1],
            outputRange: [0.42, 0.9, 1],
          }),
          top: sizePx * definition.topRatio,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 0.76, 1],
                outputRange: [sizePx * definition.entryOffsetRatio, -sizePx * 0.02, 0],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 0.76, 1],
                outputRange: [
                  `${restingRotationDegrees + definition.entryRotationOffsetDegrees}deg`,
                  `${restingRotationDegrees - definition.entryRotationOffsetDegrees * 0.2}deg`,
                  `${restingRotationDegrees}deg`,
                ],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 0.76, 1],
                outputRange: [0.88, 1.03, 1],
              }),
            },
          ],
          width: leafWidthPx,
        },
      ]}
    />
  );
}

/**
 * Shared Nestra loading mark for full-screen and inline busy states.
 * Four independently moving leaves settle into a small nest without rotating the mark itself.
 */
export function Loader({
  size = 'large',
  color,
  accessibilityLabel,
  animating = true,
  reduceMotion = false,
  style,
}: LoaderProps) {
  const theme = useNestraTheme();
  const shouldReduceMotion = useShouldReduceMotion(reduceMotion);
  const sizePx = resolveLoaderSizePx(size);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: animating }}
      style={[styles.mark, { height: sizePx, width: sizePx }, style]}
    >
      {LEAVES.map((leaf) => (
        <NestLeaf
          color={color ?? theme.colors[leaf.colorRole]}
          definition={leaf}
          key={leaf.id}
          shouldAnimate={animating && !shouldReduceMotion}
          sizePx={sizePx}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
  },
  mark: {
    position: 'relative',
  },
});
