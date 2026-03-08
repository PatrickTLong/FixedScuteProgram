import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useResponsive } from '../utils/responsive';
import { shadow, colors, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface AnimatedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColorFalse?: string;
  trackColorTrue?: string;
  size?: 'default' | 'xs' | 'small' | 'medium' | 'large';
  animate?: boolean; // Set to false to skip animation (for programmatic changes)
}

// Size dimensions lookup - avoids recreating functions on every render
const SIZE_DIMENSIONS = {
  xs:      { trackWidth: 38, trackHeight: 22, thumbSize: 16, thumbOffset: 2 },
  small:   { trackWidth: 44, trackHeight: 24, thumbSize: 18, thumbOffset: 2 },
  medium:  { trackWidth: 56, trackHeight: 30, thumbSize: 26, thumbOffset: 2 },
  large:   { trackWidth: 62, trackHeight: 34, thumbSize: 30, thumbOffset: 2 },
  default: { trackWidth: 52, trackHeight: 28, thumbSize: 24, thumbOffset: 2 },
} as const;

const FLASH_FADE_DURATION = 180;

function AnimatedSwitch({
  value,
  onValueChange,
  disabled = false,
  trackColorFalse,
  trackColorTrue = colors.green,
  size = 'medium',
  animate = true,
}: AnimatedSwitchProps) {
  const { s } = useResponsive();

  const effectiveTrackColorFalse = trackColorFalse || '#48484a';

  const dims = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.default;
  const trackWidth = s(dims.trackWidth);
  const trackHeight = s(dims.trackHeight);
  const thumbSize = s(dims.thumbSize);
  const thumbOffset = s(dims.thumbOffset);

  const isFocused = useIsFocused();

  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const thumbScale = useRef(new Animated.Value(1)).current;

  // Reset flash when screen loses focus so it doesn't freeze mid-animation
  useEffect(() => {
    if (!isFocused) {
      if (flashAnimRef.current) flashAnimRef.current.stop();
      flashOpacity.stopAnimation(() => flashOpacity.setValue(0));
    }
  }, [isFocused, flashOpacity]);

  useEffect(() => {
    if (animate) {
      Animated.spring(animatedValue, {
        toValue: value ? 1 : 0,
        speed: 40,
        bounciness: 8,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(value ? 1 : 0);
    }

  }, [value, animatedValue, animate]);

  const handlePressIn = useCallback(() => {
    if (!disabled) {
      if (flashAnimRef.current) flashAnimRef.current.stop();
      // Hold flash + scale while finger is down
      flashOpacity.setValue(0.3);
      Animated.spring(thumbScale, {
        toValue: 0.8,
        speed: 50,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled, thumbScale, flashOpacity]);

  const handlePressOut = useCallback(() => {
    // Release: fade flash out + bounce scale back
    flashAnimRef.current = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: FLASH_FADE_DURATION,
      useNativeDriver: false,
    });
    flashAnimRef.current.start();
    Animated.spring(thumbScale, {
      toValue: 1,
      speed: 20,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  }, [thumbScale, flashOpacity]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      if (haptics.toggle.enabled) triggerHaptic(haptics.toggle.type);
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
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
    >
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
        {/* Thumb + pulse wrapper */}
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            transform: [{ translateX: thumbTranslateX }],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Flash circle */}
          <Animated.View
            style={{
              position: 'absolute',
              width: thumbSize * 1.6,
              height: thumbSize * 1.6,
              borderRadius: (thumbSize * 1.6) / 2,
              backgroundColor: '#FFFFFF',
              opacity: flashOpacity,
            }}
          />
          {/* Thumb */}
          <Animated.View
            style={{
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: '#FFFFFF',
              shadowColor: disabled ? 'transparent' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: disabled ? 0 : 0.2,
              shadowRadius: disabled ? 0 : 2.5,
              elevation: disabled ? 0 : 4,
              transform: [{ scale: thumbScale }],
            }}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default memo(AnimatedSwitch);
