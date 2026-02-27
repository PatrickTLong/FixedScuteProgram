import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// ── Tweak these to adjust the animation ──
const TRANSLATE_DISTANCE = 40; // px to slide up/down

// Spring config for enter — snappy with slight bounce
const ENTER_SPRING = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

// Exit uses timing for a clean, predictable feel
const EXIT_DURATION = 200;
const EXIT_EASING = Easing.in(Easing.cubic);

export interface ScreenTransitionRef {
  animateOut: () => Promise<void>;
}

interface ScreenTransitionProps {
  children: React.ReactNode;
}

const ScreenTransition = forwardRef<ScreenTransitionRef, ScreenTransitionProps>(
  ({ children }, ref) => {
    const progress = useSharedValue(0);

    // Enter animation — spring on UI thread
    useEffect(() => {
      progress.value = withSpring(1, ENTER_SPRING);
    }, []);

    useImperativeHandle(ref, () => ({
      animateOut: () =>
        new Promise<void>((resolve) => {
          progress.value = withTiming(0, {
            duration: EXIT_DURATION,
            easing: EXIT_EASING,
          }, (finished) => {
            if (finished) {
              runOnJS(resolve)();
            }
          });
        }),
    }), []);

    const animatedStyle = useAnimatedStyle(() => ({
      flex: 1,
      opacity: progress.value,
      transform: [{ translateY: (1 - progress.value) * TRANSLATE_DISTANCE }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    );
  }
);

export default ScreenTransition;
