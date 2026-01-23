import React, { useEffect, useRef } from 'react';
import { Animated, TouchableWithoutFeedback, View } from 'react-native';
import { useResponsive } from '../utils/responsive';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  thumbColorOn?: string;
  thumbColorOff?: string;
  size?: 'default' | 'small' | 'medium' | 'large';
  /** New outline style - white thumb, transparent background, white border, icon in thumb */
  outlineStyle?: boolean;
  /** Color for the checkmark/X icon inside the thumb (when outlineStyle is true) */
  iconColor?: string;
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

// Medium size bases
const BASE_TRACK_WIDTH_MEDIUM = 48;
const BASE_TRACK_HEIGHT_MEDIUM = 29;
const BASE_THUMB_SIZE_MEDIUM = 25;
const BASE_THUMB_OFFSET_MEDIUM = 2;

// Large size bases
const BASE_TRACK_WIDTH_LARGE = 56;
const BASE_TRACK_HEIGHT_LARGE = 34;
const BASE_THUMB_SIZE_LARGE = 30;
const BASE_THUMB_OFFSET_LARGE = 2;

const ANIMATION_DURATION = 250;

export default function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse = '#767577',
  trackColorTrue = '#16a34a',
  thumbColorOn = '#22c55e',
  thumbColorOff = '#9ca3af',
  size = 'medium',
  outlineStyle = false,
  iconColor,
}: AnimatedSwitchProps) {
  const { s } = useResponsive();

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
    outputRange: [trackColorFalse, trackColorTrue],
  });

  const thumbBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbColorOff, thumbColorOn],
  });

  // For outline style, determine the icon color based on state
  const getIconColor = () => {
    if (iconColor) return iconColor;
    return value ? trackColorTrue : trackColorFalse;
  };

  // Outline style rendering
  if (outlineStyle) {
    const borderColor = value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)';
    const currentIconColor = getIconColor();

    return (
      <TouchableWithoutFeedback onPress={handlePress} disabled={disabled}>
        <Animated.View
          style={{
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackHeight / 2,
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderColor: borderColor,
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Checkmark when ON, X when OFF */}
            {value ? (
              <View
                style={{
                  width: thumbSize * 0.35,
                  height: thumbSize * 0.55,
                  borderRightWidth: 2.5,
                  borderBottomWidth: 2.5,
                  borderColor: currentIconColor,
                  transform: [{ rotate: '45deg' }],
                  marginTop: -thumbSize * 0.1,
                }}
              />
            ) : (
              <View style={{ width: thumbSize * 0.5, height: thumbSize * 0.5, alignItems: 'center', justifyContent: 'center' }}>
                {/* X icon */}
                <View
                  style={{
                    position: 'absolute',
                    width: thumbSize * 0.45,
                    height: 2.5,
                    backgroundColor: currentIconColor,
                    transform: [{ rotate: '45deg' }],
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    width: thumbSize * 0.45,
                    height: 2.5,
                    backgroundColor: currentIconColor,
                    transform: [{ rotate: '-45deg' }],
                  }}
                />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  // Default style rendering
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
