import { Image } from 'expo-image';
import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme-provider';

let startupSoundPlayed = false;

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors, mode } = useAppTheme();
  const player = useAudioPlayer(require('@/assets/audio/frog-croak.mp3'));
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.88);
  const sway = useSharedValue(-1.5);
  const blink = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web' && !startupSoundPlayed) {
      startupSoundPlayed = true;
      player.play();
    }
    scale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.2)) });
    sway.value = withRepeat(withSequence(withTiming(1.5, { duration: 520 }), withTiming(-1.5, { duration: 520 })), -1);
    blink.value = withRepeat(
      withSequence(withDelay(520, withTiming(1, { duration: 75 })), withTiming(0, { duration: 110 })),
      -1,
    );
    opacity.value = withDelay(1700, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }));
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [blink, onFinish, opacity, player, scale, sway]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${sway.value}deg` }] }));
  const eyelidStyle = useAnimatedStyle(() => ({ opacity: blink.value, transform: [{ scaleY: Math.max(blink.value, 0.05) }] }));

  return (
    <Animated.View
      className="absolute inset-0 z-50 items-center justify-center"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background, elevation: 9999, zIndex: 9999 },
        containerStyle,
      ]}
    >
      <View className="items-center px-8">
        <Animated.View className="relative h-[188px] w-[125px]" style={mascotStyle}>
          <Image
            source={require('@/assets/brand/frog-flag.png')}
            contentFit="contain"
            style={{ height: 188, width: 125 }}
          />
          <Animated.View className="absolute left-[17px] top-[39px] h-4 w-6 rounded-full bg-frog-500" style={eyelidStyle} />
          <Animated.View className="absolute left-[51px] top-[33px] h-4 w-6 rounded-full bg-frog-500" style={eyelidStyle} />
        </Animated.View>
        <Text className="mt-2 text-center text-4xl font-black tracking-tight" style={{ color: colors.text }}>
          Descubriendo CR
        </Text>
        <Text className="mt-3 text-center text-base font-semibold" style={{ color: colors.textMuted }}>
          {mode === 'dark' ? 'Pura vida, de noche y de día' : 'Costa Rica, más cerca que nunca'}
        </Text>
        <View className="mt-8 h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: colors.surfaceMuted }}>
          <Animated.View className="h-full w-full rounded-full bg-coral-500" style={{ transformOrigin: 'left' }} />
        </View>
      </View>
    </Animated.View>
  );
}
