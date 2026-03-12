import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

const CYCLE_DURATION = 2000;
const FADE_DURATION = 80;

function HourglassLoader() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const animProgress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let stopped = false;

    const runCycle = () => {
      if (stopped) return;
      animProgress.setValue(0);
      opacity.setValue(1);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: CYCLE_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        if (stopped) return;
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start(() => {
          if (stopped) return;
          animProgress.setValue(0);
          Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }).start(() => {
            runCycle();
          });
        });
      });
    };

    runCycle();

    return () => {
      stopped = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity }}>
        <AnimatedLottieView
          source={require('../frontassets/Orange colour loading.json')}
          progress={animProgress as any}
          resizeMode="contain"
          style={{ width: s(120), height: s(120) }}
        />
      </Animated.View>
    </View>
  );
}

export default memo(HourglassLoader);
