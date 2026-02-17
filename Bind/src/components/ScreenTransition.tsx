import React, { useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface ScreenTransitionProps {
  children: React.ReactNode;
}

export default function ScreenTransition({ children }: ScreenTransitionProps) {
  const translateY = useRef(new Animated.Value(40)).current;

  useFocusEffect(
    useCallback(() => {
      translateY.setValue(40);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [translateY])
  );

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
