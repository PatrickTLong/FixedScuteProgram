import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
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
  size?: 'default' | 'small' | 'medium' | 'large';
  animate?: boolean; // Set to false to skip animation (for programmatic changes)
}

// Size dimensions lookup - avoids recreating functions on every render
const SIZE_DIMENSIONS = {
  small:   { trackWidth: 44, trackHeight: 24, thumbSize: 18, thumbOffset: 2 },
  medium:  { trackWidth: 56, trackHeight: 30, thumbSize: 26, thumbOffset: 2 },
  large:   { trackWidth: 62, trackHeight: 34, thumbSize: 30, thumbOffset: 2 },
  default: { trackWidth: 52, trackHeight: 28, thumbSize: 24, thumbOffset: 2 },
} as const;

const ANIMATION_DURATION = 90;

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
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const pressedRef = useRef(false);

  // Reset pulse when screen loses focus so it doesn't freeze mid-animation
  useEffect(() => {
    if (!isFocused) {
      pulseProgress.stopAnimation();
      pulseProgress.setValue(0);
    }
  }, [isFocused, pulseProgress]);

  useEffect(() => {
    if (animate) {
      Animated.timing(animatedValue, {
        toValue: value ? 1 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
    } else {
      // Skip animation - set value instantly
      animatedValue.setValue(value ? 1 : 0);
    }

    // Only pulse on manual press, not programmatic changes
    if (pressedRef.current) {
      pressedRef.current = false;
      const pulseDelay = setTimeout(() => {
        pulseProgress.setValue(0);
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 70);
      return () => clearTimeout(pulseDelay);
    }
  }, [value, animatedValue, pulseProgress, animate]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      if (haptics.toggle.enabled) {
        triggerHaptic(haptics.toggle.type);
      }
      pressedRef.current = true;
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

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.7, 0.5, 0],
  });

  return (
    <Pressable
      onPress={handlePress}
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
          {/* Pulse circle */}
          <Animated.View
            style={{
              position: 'absolute',
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: '#FFFFFF',
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            }}
          />
          {/* Thumb */}
          <View
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
            }}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default memo(AnimatedSwitch);
