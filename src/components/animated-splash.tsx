import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useApp } from '@/providers/app-provider';

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { isDark } = useApp();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.88);
  const sway = useSharedValue(-1.5);
  const blink = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.2)) });
    sway.value = withRepeat(withSequence(withTiming(1.5, { duration: 520 }), withTiming(-1.5, { duration: 520 })), -1);
    blink.value = withRepeat(
      withSequence(withDelay(520, withTiming(1, { duration: 75 })), withTiming(0, { duration: 110 })),
      -1,
    );
    opacity.value = withDelay(1700, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }));
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [blink, onFinish, opacity, scale, sway]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${sway.value}deg` }] }));
  const eyelidStyle = useAnimatedStyle(() => ({ opacity: blink.value, transform: [{ scaleY: Math.max(blink.value, 0.05) }] }));

  return (
    <Animated.View
      className="absolute inset-0 z-50 items-center justify-center bg-mint-50 dark:bg-forest-950"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: isDark ? '#02251b' : '#f7fbf8', elevation: 9999, zIndex: 9999 },
        containerStyle,
      ]}
    >
      <View className="items-center px-8">
        <Animated.View className="relative h-[375px] w-[250px]" style={mascotStyle}>
          <Image
            source={require('@/assets/brand/frog-flag.png')}
            contentFit="contain"
            style={{ height: 375, width: 250 }}
          />
          <Animated.View className="absolute left-[33px] top-[77px] h-8 w-12 rounded-full bg-frog-500" style={eyelidStyle} />
          <Animated.View className="absolute left-[101px] top-[65px] h-8 w-12 rounded-full bg-frog-500" style={eyelidStyle} />
        </Animated.View>
        <Text className="-mt-6 text-center text-4xl font-black tracking-tight text-forest-900 dark:text-white">
          Descubriendo CR
        </Text>
        <Text className="mt-3 text-center text-base font-semibold text-forest-600 dark:text-mint-200">
          {isDark ? 'Pura vida, de noche y de día' : 'Costa Rica, más cerca que nunca'}
        </Text>
        <View className="mt-8 h-1.5 w-20 overflow-hidden rounded-full bg-mint-200 dark:bg-forest-700">
          <Animated.View className="h-full w-full rounded-full bg-coral-500" style={{ transformOrigin: 'left' }} />
        </View>
      </View>
    </Animated.View>
  );
}
