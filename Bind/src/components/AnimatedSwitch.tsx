import React, { useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';
import { useResponsive } from '../utils/responsive';
import { useTheme } from '../context/ThemeContext';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  size?: 'default' | 'small' | 'medium' | 'large';
}

// Base sizes (will be scaled) - longer and more round track
const BASE_TRACK_WIDTH = 52;
const BASE_TRACK_HEIGHT = 28;
const BASE_THUMB_SIZE = 20;
const BASE_THUMB_OFFSET = 4;

// Small size bases
const BASE_TRACK_WIDTH_SMALL = 44;
const BASE_TRACK_HEIGHT_SMALL = 24;
const BASE_THUMB_SIZE_SMALL = 16;
const BASE_THUMB_OFFSET_SMALL = 4;

// Medium size bases
const BASE_TRACK_WIDTH_MEDIUM = 56;
const BASE_TRACK_HEIGHT_MEDIUM = 30;
const BASE_THUMB_SIZE_MEDIUM = 22;
const BASE_THUMB_OFFSET_MEDIUM = 4;

// Large size bases
const BASE_TRACK_WIDTH_LARGE = 62;
const BASE_TRACK_HEIGHT_LARGE = 34;
const BASE_THUMB_SIZE_LARGE = 26;
const BASE_THUMB_OFFSET_LARGE = 4;

const ANIMATION_DURATION = 250;

export default function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse,
  trackColorTrue = '#22c55e',
  size = 'medium',
}: AnimatedSwitchProps) {
  const { s } = useResponsive();
  const { colors } = useTheme();

  // Use a slightly lighter color than colors.card (#363639) for subtle contrast
  const effectiveTrackColorFalse = trackColorFalse || '#48484a';

  // Select dimensions based on size, then scale
  const getBaseTrackWidth = () => {
    if (size === 'small') return BASE_TRACK_WIDTH_SMALL;
    if (size === 'medium') return BASE_TRACK_WIDTH_MEDIUM;
    if (size === 'large') return BASE_TRACK_WIDTH_LARGE;
    return BASE_TRACK_WIDTH;
  };
  const getBaseTrackHeight = () => {
    if (size === 'small') return BASE_TRACK_HEIGHT_SMALL;
    if (size === 'medium') return BASE_TRACK_HEIGHT_MEDIUM;
    if (size === 'large') return BASE_TRACK_HEIGHT_LARGE;
    return BASE_TRACK_HEIGHT;
  };
  const getBaseThumbSize = () => {
    if (size === 'small') return BASE_THUMB_SIZE_SMALL;
    if (size === 'medium') return BASE_THUMB_SIZE_MEDIUM;
    if (size === 'large') return BASE_THUMB_SIZE_LARGE;
    return BASE_THUMB_SIZE;
  };
  const getBaseThumbOffset = () => {
    if (size === 'small') return BASE_THUMB_OFFSET_SMALL;
    if (size === 'medium') return BASE_THUMB_OFFSET_MEDIUM;
    if (size === 'large') return BASE_THUMB_OFFSET_LARGE;
    return BASE_THUMB_OFFSET;
  };

  const trackWidth = s(getBaseTrackWidth());
  const trackHeight = s(getBaseTrackHeight());
  const thumbSize = s(getBaseThumbSize());
  const thumbOffset = s(getBaseThumbOffset());

  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

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
        }}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: '#FFFFFF',
            transform: [{ translateX: thumbTranslateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2.5,
            elevation: 4,
          }}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
