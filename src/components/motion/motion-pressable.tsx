import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

type MotionPressableProps = PressableProps & {
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export function MotionPressable({ children, containerStyle, disabled, onPressIn, onPressOut, scaleTo = 0.97, ...props }: MotionPressableProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressProgress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressProgress.value * 0.08,
    transform: [{ scale: scale.value }, { translateY: pressProgress.value * 1.5 }],
  }));

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled && !reduceMotion) {
            scale.value = withSpring(scaleTo, { damping: 18, stiffness: 360 });
            pressProgress.value = withSpring(1, { damping: 20, stiffness: 420 });
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduceMotion) {
            scale.value = withSpring(1, { damping: 16, stiffness: 300 });
            pressProgress.value = withSpring(0, { damping: 16, stiffness: 300 });
          }
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
