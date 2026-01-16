import React, { useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';

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

// Default size
const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 22;
const THUMB_OFFSET = 2;

// Small size
const TRACK_WIDTH_SMALL = 36;
const TRACK_HEIGHT_SMALL = 20;
const THUMB_SIZE_SMALL = 16;
const THUMB_OFFSET_SMALL = 2;

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
  // Select dimensions based on size
  const trackWidth = size === 'small' ? TRACK_WIDTH_SMALL : TRACK_WIDTH;
  const trackHeight = size === 'small' ? TRACK_HEIGHT_SMALL : TRACK_HEIGHT;
  const thumbSize = size === 'small' ? THUMB_SIZE_SMALL : THUMB_SIZE;
  const thumbOffset = size === 'small' ? THUMB_OFFSET_SMALL : THUMB_OFFSET;

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
          opacity: disabled ? 0.5 : 1,
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
