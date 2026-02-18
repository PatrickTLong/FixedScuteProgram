import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, AppState, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { interpolate } from 'flubber';
import { colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

// SVG paths from boxicons filled rounded 400
const CERTIFICATION_PATH =
  'm21.65,9.41c-.12-.45-.41-.83-.81-1.06l-1.26-.73v-1.45c0-.96-.79-1.75-1.75-1.75h-1.45l-.73-1.26c-.23-.4-.61-.69-1.06-.82-.45-.12-.92-.06-1.33.17l-1.26.73-1.26-.73c-.41-.23-.88-.29-1.33-.17-.45.12-.83.41-1.06.81l-.73,1.26h-1.45c-.96,0-1.75.79-1.75,1.75v1.45l-1.26.73c-.41.23-.7.61-.82,1.06s-.06.92.18,1.33l.73,1.26-.73,1.26c-.23.4-.3.88-.18,1.33s.41.83.82,1.06l1.26.73v1.45c0,.96.79,1.75,1.75,1.75h1.45l.73,1.26c.23.4.61.69,1.06.82.45.12.92.06,1.33-.18l1.26-.73,1.26.73c.27.16.57.24.87.24.15,0,.3-.02.46-.06.45-.12.83-.41,1.06-.82l.73-1.26h1.45c.96,0,1.75-.79,1.75-1.75v-1.45l1.26-.73c.41-.23.7-.61.82-1.06.12-.45.06-.92-.18-1.33l-.73-1.26.73-1.26c.23-.41.3-.88.17-1.33Z';

const SEAL_PATH =
  'm19,9.09v-1.59c0-1.38-1.12-2.5-2.5-2.5h-1.59l-1.15-1.15c-.97-.97-2.56-.97-3.54,0l-1.15,1.15h-1.59c-1.38,0-2.5,1.12-2.5,2.5v1.59l-1.15,1.15c-.97.97-.97,2.56,0,3.54l1.15,1.15v1.59c0,1.38,1.12,2.5,2.5,2.5h1.59l1.15,1.15c.49.49,1.13.73,1.77.73s1.28-.24,1.77-.73l1.15-1.15h1.59c1.38,0,2.5-1.12,2.5-2.5v-1.59l1.15-1.15c.97-.97.97-2.56,0-3.54l-1.15-1.15Z';

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
    () => interpolate(CERTIFICATION_PATH, SEAL_PATH, { maxSegmentLength: 2 }),
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
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(morphValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
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
