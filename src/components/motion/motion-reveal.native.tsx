import { type ReactNode } from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

export function MotionReveal({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(260)}>
      {children}
    </Animated.View>
  );
}
