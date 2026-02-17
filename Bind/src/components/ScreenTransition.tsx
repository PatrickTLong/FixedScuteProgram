import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export interface ScreenTransitionRef {
  animateOut: () => Promise<void>;
}

interface ScreenTransitionProps {
  children: React.ReactNode;
}

const ScreenTransition = forwardRef<ScreenTransitionRef, ScreenTransitionProps>(({ children }, ref) => {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, [scale, opacity])
  );

  useImperativeHandle(ref, () => ({
    animateOut: () =>
      new Promise<void>((resolve) => {
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.9,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      }),
  }), [scale, opacity]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View style={{ flex: 1, opacity, transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </View>
  );
});

export default ScreenTransition;
