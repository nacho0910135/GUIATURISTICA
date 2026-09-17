import { Image } from 'expo-image';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

let startupSoundPlayed = false;
const INTRO_DURATION_MS = 3000;

export function AnimatedSplash({ appReady, onFinish }: { appReady: boolean; onFinish: () => void }) {
  const player = useAudioPlayer(require('@/assets/audio/startup-transition.mp3'));
  const [showAnimation, setShowAnimation] = useState(true);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' && !startupSoundPlayed) {
      startupSoundPlayed = true;
      player.play();
    }
    const animationTimer = setTimeout(() => {
      setShowAnimation(false);
      setAnimationFinished(true);
    }, INTRO_DURATION_MS);
    return () => {
      clearTimeout(animationTimer);
    };
  }, [player]);

  useEffect(() => {
    if (animationFinished && appReady) onFinish();
  }, [animationFinished, appReady, onFinish]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      {showAnimation ? <View style={styles.frame}>
        <Image
          source={require('@/assets/images/startup-transition.gif')}
          autoplay
          contentFit="contain"
          style={styles.image}
        />
      </View> : null}
    </View>
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
    width: '77%',
  },
  image: {
    aspectRatio: 800 / 1422,
    width: '100%',
  },
});
