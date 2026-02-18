import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, AppState, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { interpolate } from 'flubber';
import { colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

// SVG paths from boxicons filled regular 400
const CERTIFICATION_PATH =
  'm21.49,8.72l-1.91-1.1v-2.2c0-.55-.45-1-1-1h-2.2l-.41-.71h0s-.7-1.2-.7-1.2c-.13-.23-.35-.4-.61-.47-.25-.07-.53-.03-.76.1l-1.91,1.1-1.91-1.1c-.48-.28-1.09-.11-1.37.37l-.7,1.2h0s-.41.7-.41.7h-2.2c-.55,0-1,.45-1,1v2.2l-1.91,1.1c-.23.13-.4.35-.47.61-.07.26-.03.53.1.76l.7,1.2h0l.41.7-.41.7h0s-.7,1.21-.7,1.21c-.13.23-.17.5-.1.76.07.26.24.48.47.61l1.91,1.1v2.2c0,.55.45,1,1,1h2.2l.41.71h0s.7,1.2.7,1.2c.19.32.52.5.87.5.17,0,.34-.04.5-.13l1.91-1.1,1.91,1.1c.23.13.5.17.76.1.26-.07.47-.24.61-.47l.7-1.2h0s.41-.7.41-.7h2.2c.55,0,1-.45,1-1v-2.2l1.91-1.1c.48-.28.64-.89.37-1.37l-1.1-1.91,1.1-1.91c.28-.48.11-1.09-.37-1.37Z';

const SEAL_PATH =
  'm21.21,11.29l-2.21-2.21v-3.09c0-.55-.45-1-1-1h-3.09l-2.21-2.21c-.39-.39-1.02-.39-1.41,0l-2.21,2.21h-3.09c-.55,0-1,.45-1,1v3.09l-2.21,2.21c-.39.39-.39,1.02,0,1.41l2.21,2.21v3.09c0,.55.45,1,1,1h3.09l2.21,2.21c.2.2.45.29.71.29s.51-.1.71-.29l2.21-2.21h3.09c.55,0,1-.45,1-1v-3.09l2.21-2.21c.39-.39.39-1.02,0-1.41Z';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size, color = colors.spinner, fullScreen = false }: LoadingSpinnerProps) {
  const { s } = useResponsive();
  const spinValue = useRef(new Animated.Value(0)).current;
  const morphValue = useRef(new Animated.Value(0)).current;
  const iconSize = size ?? s(32);

  const spinRef = useRef<Animated.CompositeAnimation | null>(null);
  const morphRef = useRef<Animated.CompositeAnimation | null>(null);

  const [morphPath, setMorphPath] = useState(CERTIFICATION_PATH);

  // Create the flubber interpolator once
  const morphInterpolator = useMemo(
    () => interpolate(CERTIFICATION_PATH, SEAL_PATH, { maxSegmentLength: 1 }),
    [],
  );

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

  const startMorph = () => {
    morphRef.current?.stop();
    morphValue.setValue(0);
    morphRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(morphValue, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(morphValue, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    morphRef.current.start();
  };

  // Listen to morphValue changes and update the path
  useEffect(() => {
    const listenerId = morphValue.addListener(({ value }) => {
      const t = Math.min(Math.max(value, 0), 1);
      setMorphPath(morphInterpolator(t));
    });
    return () => morphValue.removeListener(listenerId);
  }, [morphValue, morphInterpolator]);

  useEffect(() => {
    startSpin();
    startMorph();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startSpin();
        startMorph();
      }
    });

    return () => {
      spinRef.current?.stop();
      morphRef.current?.stop();
      sub.remove();
    };
  }, [spinValue, morphValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const icon = (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
        <Path d={morphPath} fill={color} />
      </Svg>
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
