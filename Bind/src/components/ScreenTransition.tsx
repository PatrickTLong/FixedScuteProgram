import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { NavigationContext } from '@react-navigation/native';
import { colors, transition } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface ScreenTransitionRef {
  animateOut: (direction?: TransitionDirection) => Promise<void>;
  animateIn: (direction?: TransitionDirection) => Promise<void>;
}

interface ScreenTransitionProps {
  children: React.ReactNode;
  from?: TransitionDirection;
  autoAnimate?: boolean;
}

function getTranslation(dir: TransitionDirection, amount: number) {
  'worklet';
  switch (dir) {
    case 'left':  return { x: -amount * SCREEN_WIDTH * 0.3, y: 0 };
    case 'right': return { x: amount * SCREEN_WIDTH * 0.3, y: 0 };
    case 'up':    return { x: 0, y: -amount * SCREEN_HEIGHT * 0.3 };
    case 'down':  return { x: 0, y: amount * SCREEN_HEIGHT * 0.3 };
  }
}

const ScreenTransition = forwardRef<ScreenTransitionRef, ScreenTransitionProps>(
  ({ children, from, autoAnimate = true }, ref) => {
    const progress = useSharedValue(autoAnimate ? 0 : 1);
    // Store the current direction for animation: maps to the direction content slides FROM
    // 'right' = content slides in from the right, 'down' = content slides in from below, etc.
    const currentDir = useSharedValue<TransitionDirection>(from ?? 'right');
    const navigation = React.useContext(NavigationContext);

    useEffect(() => {
      if (!autoAnimate) return;
      currentDir.value = from ?? 'right';
      const animateIn = () => {
        progress.value = withTiming(1, {
          duration: transition.inDuration,
          easing: Easing.out(Easing.quad),
        });
      };

      if (!navigation) {
        animateIn();
        return;
      }

      if (navigation.isFocused()) {
        animateIn();
      }
      const unsubscribe = navigation.addListener('focus', animateIn);
      return unsubscribe;
    }, []);

    useImperativeHandle(ref, () => ({
      animateOut: (dir?: TransitionDirection) =>
        new Promise<void>((resolve) => {
          if (dir) currentDir.value = dir;
          progress.value = withTiming(0, {
            duration: transition.outDuration,
            easing: Easing.in(Easing.quad),
          }, (finished) => {
            if (finished) runOnJS(resolve)();
          });
        }),
      animateIn: (dir?: TransitionDirection) =>
        new Promise<void>((resolve) => {
          if (dir) currentDir.value = dir;
          progress.value = withTiming(1, {
            duration: transition.inDuration,
            easing: Easing.out(Easing.quad),
          }, (finished) => {
            if (finished) runOnJS(resolve)();
          });
        }),
    }), []);

    const animatedStyle = useAnimatedStyle(() => {
      const remaining = 1 - progress.value;
      const t = getTranslation(currentDir.value, remaining);
      // Scale from 0.92 → 1.0 as progress goes 0 → 1
      const scale = interpolate(progress.value, [0, 1], [0.92, 1]);
      return {
        flex: 1,
        opacity: progress.value,
        transform: [
          { translateX: t.x },
          { translateY: t.y },
          { scale },
        ],
      };
    });

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
        <Animated.View
          style={[animatedStyle, { backgroundColor: colors.bg }]}
          renderToHardwareTextureAndroid
        >
          {children}
        </Animated.View>
      </View>
    );
  }
);

export default ScreenTransition;
