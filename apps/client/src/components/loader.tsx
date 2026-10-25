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
  readonly angleDegrees: number;
  readonly colorRole: 'primary' | 'secondary' | 'tertiary';
  readonly direction: 1 | -1;
  readonly opacity: number;
  readonly radiusRatio: number;
  readonly scale: number;
};

const LOADER_SIZE_PX = {
  small: 28,
  large: 56,
} as const;

const ANIMATION_DURATION_MS = 3_200;
const LEAF_WIDTH_RATIO = 0.33;
const LEAF_HEIGHT_RATIO = 0.19;
const ORBIT_INPUT_RANGE = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const;

const LEAVES: readonly LeafDefinition[] = [
  {
    id: 'outer-primary',
    angleDegrees: -88,
    colorRole: 'primary',
    direction: -1,
    opacity: 1,
    radiusRatio: 0.33,
    scale: 1,
  },
  {
    id: 'outer-tertiary',
    angleDegrees: 1,
    colorRole: 'tertiary',
    direction: -1,
    opacity: 0.94,
    radiusRatio: 0.27,
    scale: 0.94,
  },
  {
    id: 'outer-secondary',
    angleDegrees: 94,
    colorRole: 'secondary',
    direction: -1,
    opacity: 0.9,
    radiusRatio: 0.21,
    scale: 0.88,
  },
  {
    id: 'inner-primary',
    angleDegrees: 181,
    colorRole: 'primary',
    direction: 1,
    opacity: 0.86,
    radiusRatio: 0.16,
    scale: 0.84,
  },
  {
    id: 'inner-tertiary',
    angleDegrees: 252,
    colorRole: 'tertiary',
    direction: 1,
    opacity: 0.82,
    radiusRatio: 0.1,
    scale: 0.78,
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

function useCyclingProgress(shouldAnimate: boolean): Animated.Value {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shouldAnimate) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        // A neutral first step prevents loop resets from restoring `progress` to its initial 1.
        Animated.delay(0),
        Animated.timing(progress, {
          duration: ANIMATION_DURATION_MS,
          easing: Easing.linear,
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          duration: 0,
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [progress, shouldAnimate]);

  return progress;
}

function OrbitingLeaf({
  color,
  definition,
  progress,
  sizePx,
}: {
  readonly color: string;
  readonly definition: LeafDefinition;
  readonly progress: Animated.Value;
  readonly sizePx: number;
}) {
  const leafWidthPx = sizePx * LEAF_WIDTH_RATIO;
  const leafHeightPx = sizePx * LEAF_HEIGHT_RATIO;
  const leftOutputRangePx = ORBIT_INPUT_RANGE.map((keyframe) => {
    const angleRadians =
      ((definition.angleDegrees + definition.direction * keyframe * 360) * Math.PI) / 180;
    return sizePx / 2 + Math.cos(angleRadians) * sizePx * definition.radiusRatio - leafWidthPx / 2;
  });
  const topOutputRangePx = ORBIT_INPUT_RANGE.map((keyframe) => {
    const angleRadians =
      ((definition.angleDegrees + definition.direction * keyframe * 360) * Math.PI) / 180;
    return sizePx / 2 + Math.sin(angleRadians) * sizePx * definition.radiusRatio - leafHeightPx / 2;
  });
  const rotationOutputRange = ORBIT_INPUT_RANGE.map(
    (keyframe) => `${definition.angleDegrees + 68 + definition.direction * keyframe * 360}deg`,
  );

  return (
    <Animated.View
      style={[
        styles.leaf,
        {
          backgroundColor: color,
          borderBottomLeftRadius: leafHeightPx * 0.08,
          borderBottomRightRadius: leafHeightPx,
          borderTopLeftRadius: leafHeightPx,
          borderTopRightRadius: leafHeightPx * 0.08,
          height: leafHeightPx,
          left: progress.interpolate({
            inputRange: [...ORBIT_INPUT_RANGE],
            outputRange: leftOutputRangePx,
          }),
          opacity: definition.opacity,
          top: progress.interpolate({
            inputRange: [...ORBIT_INPUT_RANGE],
            outputRange: topOutputRangePx,
          }),
          transform: [
            {
              rotate: progress.interpolate({
                inputRange: [...ORBIT_INPUT_RANGE],
                outputRange: rotationOutputRange,
              }),
            },
            { scale: definition.scale },
          ],
          width: leafWidthPx,
        },
      ]}
    >
      <View
        style={[
          styles.petiole,
          {
            backgroundColor: color,
            borderRadius: leafHeightPx,
            height: Math.max(1, leafHeightPx * 0.16),
            right: -leafWidthPx * 0.1,
            top: leafHeightPx * 0.46,
            width: leafWidthPx * 0.2,
          },
        ]}
      />
    </Animated.View>
  );
}

/**
 * Shared Nestra loading mark for full-screen and inline busy states.
 * Five leaves form a spiral whose inner and outer layers rotate in opposite directions.
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
  const progress = useCyclingProgress(animating && !shouldReduceMotion);
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
        <OrbitingLeaf
          color={color ?? theme.colors[leaf.colorRole]}
          definition={leaf}
          key={leaf.id}
          progress={progress}
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
  petiole: {
    position: 'absolute',
  },
});
