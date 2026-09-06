import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function AnimatedShine({ travel = 320 }: { travel?: number }) {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !isFocused) {
      progress.value = 0;
      return undefined;
    }

    progress.value = withRepeat(
      withSequence(
        withDelay(900, withTiming(1, { duration: 720, easing: Easing.inOut(Easing.quad) })),
        withDelay(2100, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(progress);
  }, [isFocused, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.92, 1], [0, 0.62, 0.62, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-64, travel]) },
      { rotate: '-18deg' },
    ],
  }));

  if (reduceMotion) return null;

  return <Animated.View style={[styles.shine, animatedStyle]} />;
}

const styles = StyleSheet.create({
  shine: {
    backgroundColor: 'rgba(255,255,255,0.34)',
    bottom: -24,
    position: 'absolute',
    pointerEvents: 'none',
    top: -24,
    width: 34,
  },
});
