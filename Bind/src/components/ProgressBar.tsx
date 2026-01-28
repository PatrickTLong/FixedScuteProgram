import React, { memo, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-end justify-center gap-2 mt-5">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index + 1 === currentStep;
        const isPassed = index + 1 < currentStep;

        return (
          <View
            key={index}
            style={{
              backgroundColor: isActive || isPassed ? '#22c55e' : colors.border,
              width: 10,
              height: isActive ? 14 : 10,
              marginBottom: isActive ? 4 : 0,
            }}
            className="rounded-full"
          />
        );
      })}
    </View>
  );
}

export default memo(ProgressBar);
