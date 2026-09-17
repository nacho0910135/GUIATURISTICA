import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type FrogLoaderProps = {
  accessibilityLabel?: string;
  branded?: boolean;
  className?: string;
  color?: string;
  size?: 'small' | 'large' | number;
  style?: StyleProp<ViewStyle>;
};

export function FrogLoader(props: FrogLoaderProps) {
  if (!props.branded) return null;
  return <BrandedFrogLoader {...props} />;
}

function BrandedFrogLoader({
  accessibilityLabel = 'Cargando',
  className,
  style,
}: FrogLoaderProps) {
  const reducedMotion = useReducedMotion();
  const player = useVideoPlayer(require('@/assets/VIDEO DE TRANSICION/NUEVO.mp4'), (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });
  useEffect(() => { if (reducedMotion) player.pause(); else player.play(); }, [player, reducedMotion]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      className={className}
      style={[styles.container, style]}
    >
      <VideoView contentFit="contain" nativeControls={false} player={player} style={styles.video} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  video: {
    aspectRatio: 1,
    width: '77%',
  },
});
