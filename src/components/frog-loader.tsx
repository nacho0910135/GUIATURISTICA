import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme-provider';

type FrogLoaderProps = {
  accessibilityLabel?: string;
  branded?: boolean;
  className?: string;
  color?: string;
  size?: 'small' | 'large' | number;
  style?: StyleProp<ViewStyle>;
};

const frogOpen = require('@/assets/brand/frog-logo-open.png');
const frogBlink = require('@/assets/brand/frog-logo-blink.png');

export function FrogLoader(props: FrogLoaderProps) {
  if (!props.branded) return null;
  return <BrandedFrogLoader {...props} />;
}

function BrandedFrogLoader({
  accessibilityLabel = 'Cargando',
  className,
  size = 'small',
  style,
}: FrogLoaderProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const blinkOpacity = useSharedValue(0);
  const dimension = typeof size === 'number' ? size : size === 'large' ? 112 : 24;

  useEffect(() => {
    if (reducedMotion) {
      blinkOpacity.value = 0;
      return;
    }

    blinkOpacity.value = withRepeat(
      withSequence(
        withDelay(650, withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) }),
        withDelay(850, withTiming(0, { duration: 1 })),
      ),
      -1,
    );
  }, [blinkOpacity, reducedMotion]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blinkOpacity.value }));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      className={className}
      style={[
        styles.container,
        { minHeight: Math.max(440, windowHeight - 300), width: '100%' },
        style,
      ]}
    >
      <View style={{ height: dimension, width: dimension }}>
        <Image contentFit="contain" source={frogOpen} style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
          <Image contentFit="contain" source={frogBlink} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <View style={styles.wordmark}>
        <Text style={[styles.title, { color: colors.text }]}>Descubriendo <Text style={styles.country}>CR</Text></Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>EXPLORÁ DISTINTO 🇨🇷</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  country: {
    color: '#EF4B45',
  },
  tagline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    marginTop: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 23,
    letterSpacing: -0.7,
  },
  wordmark: {
    alignItems: 'center',
    marginTop: 12,
  },
});
