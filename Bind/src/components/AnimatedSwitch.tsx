import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';
import { useResponsive } from '../utils/responsive';
import { shadow } from '../context/ThemeContext';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  size?: 'default' | 'small' | 'medium' | 'large';
}

// Size dimensions lookup - avoids recreating functions on every render
const SIZE_DIMENSIONS = {
  small:   { trackWidth: 44, trackHeight: 24, thumbSize: 16, thumbOffset: 4 },
  medium:  { trackWidth: 56, trackHeight: 30, thumbSize: 22, thumbOffset: 4 },
  large:   { trackWidth: 62, trackHeight: 34, thumbSize: 26, thumbOffset: 4 },
  default: { trackWidth: 52, trackHeight: 28, thumbSize: 20, thumbOffset: 4 },
} as const;

const ANIMATION_DURATION = 120;

function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse,
  trackColorTrue = '#22c55e',
  size = 'medium',
}: AnimatedSwitchProps) {
  const { s } = useResponsive();

  const effectiveTrackColorFalse = trackColorFalse || '#48484a';

  const dims = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.default;
  const trackWidth = s(dims.trackWidth);
  const trackHeight = s(dims.trackHeight);
  const thumbSize = s(dims.thumbSize);
  const thumbOffset = s(dims.thumbOffset);

  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbOffset, trackWidth - thumbSize - thumbOffset],
  });

  const trackBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [effectiveTrackColorFalse, trackColorTrue],
  });

  return (
    <TouchableWithoutFeedback onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={{
          width: trackWidth,
          height: trackHeight,
          borderRadius: trackHeight / 2,
          justifyContent: 'center',
          backgroundColor: trackBackgroundColor,
          opacity: disabled ? 0.5 : 1,
          ...shadow.card,
        }}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: thumbTranslateX }],
            shadowColor: disabled ? 'transparent' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: disabled ? 0 : 0.2,
            shadowRadius: disabled ? 0 : 2.5,
            elevation: disabled ? 0 : 4,
          }}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default memo(AnimatedSwitch);
