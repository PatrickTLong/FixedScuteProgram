import React, { useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback, View, StyleSheet } from 'react-native';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  thumbColorOn?: string;
  thumbColorOff?: string;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 22;
const THUMB_OFFSET = 2;
const ANIMATION_DURATION = 250;

export default function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse = '#767577',
  trackColorTrue = '#16a34a',
  thumbColorOn = '#22c55e',
  thumbColorOff = '#9ca3af',
}: AnimatedSwitchProps) {
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
    outputRange: [THUMB_OFFSET, TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET],
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
        style={[
          styles.track,
          {
            backgroundColor: trackBackgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbBackgroundColor,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 4,
  },
});
