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
  const scaleValue = useRef(new Animated.Value(0)).current;
  const iconSize = size ?? s(32);

  const spinRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleRef = useRef<Animated.CompositeAnimation | null>(null);

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

  const startScale = () => {
    scaleRef.current?.stop();
    scaleValue.setValue(0);
    scaleRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    scaleRef.current.start();
  };

  useEffect(() => {
    startSpin();
    startScale();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startSpin();
        startScale();
      }
    });

    return () => {
      spinRef.current?.stop();
      scaleRef.current?.stop();
      sub.remove();
    };
  }, [spinValue, scaleValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = scaleValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const icon = (
    <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
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
