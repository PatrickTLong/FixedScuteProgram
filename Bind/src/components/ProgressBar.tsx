import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsive } from '../utils/responsive';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const { s } = useResponsive();
  return (
    <View style={{ position: 'absolute', top: s(72), left: 0, right: 0, zIndex: 5 }} className="flex-row items-center justify-center gap-3">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;

        return (
          <AnimatedDot key={index} isActive={isActive} />
        );
      })}
    </View>
  );
}

const AnimatedDot = memo(function AnimatedDot({ isActive }: { isActive: boolean }) {
  const { s } = useResponsive();
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -1.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();

    return () => floatAnimation.stop();
  }, [floatAnim]);

  useEffect(() => {
    if (isActive) {
      Animated.spring(translateYAnim, {
        toValue: -10,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    } else {
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    }
  }, [isActive, translateYAnim]);

  // Re-trigger bounce when screen regains focus (e.g. navigating back)
  useFocusEffect(
    useCallback(() => {
      if (isActive) {
        translateYAnim.setValue(0);
        Animated.spring(translateYAnim, {
          toValue: -10,
          useNativeDriver: true,
          friction: 5,
          tension: 100,
        }).start();
      }
    }, [isActive, translateYAnim])
  );

  return (
    <Animated.View
      style={{
        backgroundColor: '#FFFFFF',
        opacity: isActive ? 1.0 : 0.3,
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        transform: [
          { translateY: Animated.add(translateYAnim, floatAnim) },
        ],
      }}
    />
  );
});

export default memo(ProgressBar);
