import { useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const SEAL_PATH =
  'm21.21,11.29l-2.21-2.21v-3.09c0-.55-.45-1-1-1h-3.09l-2.21-2.21c-.39-.39-1.02-.39-1.41,0l-2.21,2.21h-3.09c-.55,0-1,.45-1,1v3.09l-2.21,2.21c-.39.39-.39,1.02,0,1.41l2.21,2.21v3.09c0,.55.45,1,1,1h3.09l2.21,2.21c.2.2.45.29.71.29s.51-.1.71-.29l2.21-2.21h3.09c.55,0,1-.45,1-1v-3.09l2.21-2.21c.39-.39.39-1.02,0-1.41Z';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
  slideIn?: boolean;
  spinDuration?: number;
}

export default function LoadingSpinner({ size, color = colors.spinner, fullScreen = false, slideIn = false, spinDuration = 700 }: LoadingSpinnerProps) {
  const { s } = useResponsive();
  const spinValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(slideIn ? 1 : 0)).current;
  const iconSize = size ?? s(32);

  const jumpValue = useRef(new Animated.Value(0)).current;
  const jumpTimeout = useRef<ReturnType<typeof setTimeout>>();
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = () => {
    spinRef.current?.stop();
    spinValue.setValue(0);
    spinRef.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: spinDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinRef.current.start();
  };

  const startJump = () => {
    const jump = () => {
      const height = -(3 + Math.random() * 3);
      Animated.sequence([
        Animated.timing(jumpValue, {
          toValue: height,
          duration: 180 + Math.random() * 60,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(jumpValue, {
          toValue: 0,
          duration: 350 + Math.random() * 100,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]).start(() => {
        jumpTimeout.current = setTimeout(jump, 50 + Math.random() * 100);
      });
    };
    // Immediate first jump so it's obvious
    jump();
  };

  useEffect(() => {
    if (slideIn) {
      Animated.spring(slideValue, {
        toValue: 0,
        speed: 28,
        bounciness: 14,
        useNativeDriver: true,
      }).start(() => {
        startJump();
      });
    }

    return () => {
      if (jumpTimeout.current) clearTimeout(jumpTimeout.current);
    };
  }, []);

  useEffect(() => {
    startSpin();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startSpin();
      }
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

  const slideTranslateY = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const slideOpacity = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const icon = (
    <Animated.View style={slideIn ? { transform: [{ translateY: slideTranslateY }, { translateY: jumpValue }], opacity: slideOpacity } : undefined}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <Path d={SEAL_PATH} fill={color} />
        </Svg>
      </Animated.View>
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
