import { Image } from 'expo-image';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

let startupSoundPlayed = false;

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const player = useAudioPlayer(require('@/assets/audio/startup-transition.mp3'));
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' && !startupSoundPlayed) {
      startupSoundPlayed = true;
      player.play();
    }
    const animationTimer = setTimeout(() => setShowAnimation(false), 2000);
    const finishTimer = setTimeout(onFinish, 2300);
    return () => {
      clearTimeout(animationTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish, player]);

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
    borderColor: '#000000',
    borderWidth: 8,
    width: '77%',
  },
  image: {
    aspectRatio: 800 / 1422,
    width: '100%',
  },
});
