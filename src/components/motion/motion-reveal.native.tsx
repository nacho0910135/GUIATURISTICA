import { type ReactNode } from 'react';
import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';

export function MotionReveal({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <MotiView
      animate={{ opacity: 1, translateY: 0 }}
      from={{ opacity: reduceMotion ? 1 : 0, translateY: reduceMotion ? 0 : 8 }}
      transition={{ damping: 18, mass: 0.7, stiffness: 180, type: 'spring' }}
    >
      {children}
    </MotiView>
  );
}
