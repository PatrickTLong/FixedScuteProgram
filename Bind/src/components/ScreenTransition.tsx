import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
        progress.value = withSpring(1, {
          damping: 18,
          stiffness: 180,
          mass: 0.8,
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
          progress.value = withSpring(1, {
            damping: 18,
            stiffness: 180,
            mass: 0.8,
          }, (finished) => {
            if (finished) runOnJS(resolve)();
          });
        }),
    }), []);

    const animatedStyle = useAnimatedStyle(() => {
      const remaining = 1 - progress.value;
      const t = getTranslation(currentDir.value, remaining);
      // Steeper opacity curve — stays faded longer, snaps in at the end
      const opacity = interpolate(progress.value, [0, 0.6, 1], [0, 0.15, 1]);
      return {
        flex: 1,
        opacity,
        transform: [
          { translateX: t.x },
          { translateY: t.y },
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
