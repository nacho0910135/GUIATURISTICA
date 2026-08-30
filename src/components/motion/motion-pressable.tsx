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
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled && !reduceMotion) scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduceMotion) scale.value = withSpring(1, { damping: 16, stiffness: 280 });
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
