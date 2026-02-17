import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View } from 'react-native';
import BoxiconsFilledRounded from './BoxiconsFilledRounded';
import { colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size, color = colors.spinner, fullScreen = false }: LoadingSpinnerProps) {
  const { s } = useResponsive();
  const spinValue = useRef(new Animated.Value(0)).current;
  const iconSize = size ?? s(32);

  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = () => {
    spinRef.current?.stop();
    spinValue.setValue(0);
    spinRef.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinRef.current.start();
  };

  useEffect(() => {
    startSpin();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startSpin();
    });

    return () => {
      spinRef.current?.stop();
      sub.remove();
    };
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const icon = (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <BoxiconsFilledRounded name="bx-certification" size={iconSize} color={color} />
    </Animated.View>
  );

  if (fullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
    );
  }

  return icon;
}
