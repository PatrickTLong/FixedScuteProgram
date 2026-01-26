import React, { memo, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const { colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetProgress = (currentStep / totalSteps) * 100;
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 300,
      useNativeDriver: false, // width animation requires non-native driver
    }).start();
  }, [currentStep, totalSteps]);

  return (
    <View style={{ backgroundColor: colors.border }} className="w-48 h-2 rounded-full overflow-hidden self-center mt-5">
      <Animated.View
        style={{
          backgroundColor: '#22c55e',
          width: progressAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
        }}
        className="h-full rounded-full"
      />
    </View>
  );
}

export default memo(ProgressBar);
