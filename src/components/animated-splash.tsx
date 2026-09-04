import { Image } from 'expo-image';
import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

let startupSoundPlayed = false;

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const player = useAudioPlayer(require('@/assets/audio/startup-transition.mp3'));
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== 'web' && !startupSoundPlayed) {
      startupSoundPlayed = true;
      player.play();
    }
    opacity.value = withDelay(2000, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }));
    const timer = setTimeout(onFinish, 2300);
    return () => clearTimeout(timer);
  }, [onFinish, opacity, player]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, containerStyle]}>
      <View style={styles.frame}>
        <Image
          source={require('@/assets/images/startup-transition.gif')}
          autoplay
          contentFit="contain"
          style={styles.image}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 9999,
    justifyContent: 'center',
    zIndex: 9999,
  },
  frame: {
    borderColor: '#000000',
    borderWidth: 8,
    width: '77%',
  },
  image: {
    aspectRatio: 800 / 1422,
    width: '100%',
  },
});
