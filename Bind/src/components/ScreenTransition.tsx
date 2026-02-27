import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { NavigationContext } from '@react-navigation/native';
import { colors, transition } from '../context/ThemeContext';

export interface ScreenTransitionRef {
  animateOut: () => Promise<void>;
}

interface ScreenTransitionProps {
  children: React.ReactNode;
}

const ScreenTransition = forwardRef<ScreenTransitionRef, ScreenTransitionProps>(
  ({ children }, ref) => {
    const progress = useSharedValue(0);
    const navigation = React.useContext(NavigationContext);

    useEffect(() => {
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
      animateOut: () =>
        new Promise<void>((resolve) => {
          progress.value = withTiming(0, {
            duration: transition.outDuration,
            easing: Easing.in(Easing.quad),
          }, (finished) => {
            if (finished) runOnJS(resolve)();
          });
        }),
    }), []);

    const animatedStyle = useAnimatedStyle(() => ({
      flex: 1,
      opacity: progress.value,
      transform: [{ translateY: (1 - progress.value) * transition.distance }],
    }));

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
