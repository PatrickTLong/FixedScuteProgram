import React, { useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';
import { useResponsive } from '../utils/responsive';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  thumbColorOn?: string;
  thumbColorOff?: string;
  size?: 'default' | 'small';
}

// Base sizes (will be scaled)
const BASE_TRACK_WIDTH = 44;
const BASE_TRACK_HEIGHT = 26;
const BASE_THUMB_SIZE = 22;
const BASE_THUMB_OFFSET = 2;

// Small size bases
const BASE_TRACK_WIDTH_SMALL = 36;
const BASE_TRACK_HEIGHT_SMALL = 20;
const BASE_THUMB_SIZE_SMALL = 16;
const BASE_THUMB_OFFSET_SMALL = 2;

const ANIMATION_DURATION = 250;

export default function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse = '#767577',
  trackColorTrue = '#16a34a',
  thumbColorOn = '#22c55e',
  thumbColorOff = '#9ca3af',
  size = 'default',
}: AnimatedSwitchProps) {
  const { s } = useResponsive();

  // Select dimensions based on size, then scale
  const trackWidth = s(size === 'small' ? BASE_TRACK_WIDTH_SMALL : BASE_TRACK_WIDTH);
  const trackHeight = s(size === 'small' ? BASE_TRACK_HEIGHT_SMALL : BASE_TRACK_HEIGHT);
  const thumbSize = s(size === 'small' ? BASE_THUMB_SIZE_SMALL : BASE_THUMB_SIZE);
  const thumbOffset = s(size === 'small' ? BASE_THUMB_OFFSET_SMALL : BASE_THUMB_OFFSET);

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
    outputRange: [trackColorFalse, trackColorTrue],
  });

  const thumbBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbColorOff, thumbColorOn],
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
        }}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbBackgroundColor,
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
