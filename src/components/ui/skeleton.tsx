import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme-provider';

export type SkeletonProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ className = 'h-4 w-full rounded-lg', style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const { colors } = useAppTheme();
  const opacity = useSharedValue(reduceMotion ? 0.64 : 0.34);

  useEffect(() => {
    opacity.value = reduceMotion ? 0.64 : withRepeat(withTiming(0.92, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View accessibilityElementsHidden className={`overflow-hidden bg-ui-muted dark:bg-ui-dark-muted ${className}`} importantForAccessibility="no-hide-descendants" style={style}>
      <Animated.View style={[{ backgroundColor: colors.border, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, animatedStyle]} />
    </View>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <View accessibilityLabel="Cargando contenido" accessibilityRole="progressbar" className={`rounded-card border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface ${className}`}>
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-3 w-1/2 rounded-lg" />
        </View>
      </View>
      <View className="mt-5 gap-2">
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-3 w-11/12 rounded-lg" />
        <Skeleton className="h-3 w-2/3 rounded-lg" />
      </View>
    </View>
  );
}
