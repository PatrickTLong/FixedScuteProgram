import React, { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface FadeFromBottomProps {
  children: React.ReactNode;
  duration?: number;
  distance?: number;
}

export default function FadeFromBottom({
  children,
  duration = 280,
  distance = 30,
}: FadeFromBottomProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset to starting position
      opacity.setValue(0);
      translateY.setValue(distance);

      // Opacity fades in fast so content appears quickly,
      // translateY slides a bit longer for a smooth settle
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: Math.round(duration * 0.55),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // When screen loses focus, hide it so there's no flash when returning
      return () => {
        opacity.setValue(0);
      };
    }, [])
  );

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
