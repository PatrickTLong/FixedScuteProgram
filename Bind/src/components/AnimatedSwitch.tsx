import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
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

// Bubbly dimensions — thumb sits fat inside a snug track
const SIZE_DIMENSIONS = {
  xs:      { trackWidth: 36, trackHeight: 23, thumbSize: 18, thumbOffset: 2 },
  small:   { trackWidth: 42, trackHeight: 26, thumbSize: 21, thumbOffset: 2 },
  medium:  { trackWidth: 52, trackHeight: 31, thumbSize: 26, thumbOffset: 2 },
  large:   { trackWidth: 58, trackHeight: 35, thumbSize: 30, thumbOffset: 2 },
  default: { trackWidth: 48, trackHeight: 29, thumbSize: 24, thumbOffset: 2 },
} as const;

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

  // Separate animated values so everything can use native driver
  const thumbProgress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const trackOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current; // JS-driven (flash)
  const thumbScale = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(false);
  const manualPressRef = useRef(false);

  // Reset pulse when screen loses focus so it doesn't freeze mid-animation
  useEffect(() => {
    if (!isFocused) {
      pulseProgress.stopAnimation();
      pulseProgress.setValue(0);
      thumbScale.setValue(1);
    }
  }, [isFocused, pulseProgress, thumbScale]);

  useEffect(() => {
    const toValue = value ? 1 : 0;

    // Skip animation on initial mount (values already initialized correctly)
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (animate) {
      // Animate all value changes (manual press or programmatic deactivation)
      Animated.parallel([
        Animated.spring(thumbProgress, {
          toValue,
          stiffness: 1200,
          damping: 40,
          mass: 0.3,
          useNativeDriver: true,
        }),
        Animated.spring(trackOpacity, {
          toValue,
          stiffness: 1200,
          damping: 40,
          mass: 0.3,
          useNativeDriver: true,
        }),
      ]).start();

      // Flash pulse only on manual press
      if (manualPressRef.current) {
        manualPressRef.current = false;
        pulseProgress.setValue(1);
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // animate=false — snap instantly (e.g. expiry)
      thumbProgress.setValue(toValue);
      trackOpacity.setValue(toValue);
    }
  }, [value, thumbProgress, trackOpacity, pulseProgress, animate]);

  const handlePressIn = useCallback(() => {
    if (!disabled) {
      Animated.spring(thumbScale, {
        toValue: 0.75,
        stiffness: 600,
        damping: 20,
        mass: 0.3,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled, thumbScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(thumbScale, {
      toValue: 1,
      stiffness: 500,
      damping: 18,
      mass: 0.4,
      useNativeDriver: true,
    }).start();
  }, [thumbScale]);

  const handlePress = useCallback(() => {
    if (!disabled) {
      if (haptics.toggle.enabled) triggerHaptic(haptics.toggle.type);
      manualPressRef.current = true;
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  const thumbTranslateX = thumbProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbOffset, trackWidth - thumbSize - thumbOffset],
  });

  const flashOpacity = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  const iconSize = thumbSize * 0.48;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
    >
      <View
        style={{
          width: trackWidth,
          height: trackHeight,
          borderRadius: trackHeight / 2,
          ...shadow.card,
        }}
      >
        {/* Off-state track (bottom layer) */}
        <View
          style={{
            position: 'absolute',
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackHeight / 2,
            backgroundColor: disabled ? '#3a3a3c' : effectiveTrackColorFalse,
          }}
        />
        {/* On-state track (top layer, opacity animated natively) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: trackWidth,
            height: trackHeight,
            borderRadius: trackHeight / 2,
            backgroundColor: disabled ? '#2d6e3f' : trackColorTrue,
            opacity: trackOpacity,
          }}
        />
        {/* Thumb + pulse wrapper */}
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            transform: [{ translateX: thumbTranslateX }, { scale: thumbScale }],
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: (trackHeight - thumbSize) / 2,
          }}
        >
          {/* Flash circle */}
          <Animated.View
            style={{
              position: 'absolute',
              width: thumbSize * 1.8,
              height: thumbSize * 1.8,
              borderRadius: (thumbSize * 1.8) / 2,
              backgroundColor: '#FFFFFF',
              opacity: flashOpacity,
            }}
          />
          {/* Thumb */}
          <View
            style={{
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: disabled ? '#b0b0b0' : '#FFFFFF',
              shadowColor: disabled ? 'transparent' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: disabled ? 0 : 0.2,
              shadowRadius: disabled ? 0 : 2.5,
              elevation: disabled ? 0 : 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value ? (
              <Svg width={iconSize} height={iconSize} viewBox="0 0 256 256" fill="none">
                <Path
                  d="M243.31,90.91l-128.4,128.4a16,16,0,0,1-22.62,0l-71.62-72a16,16,0,0,1,0-22.61l20-20a16,16,0,0,1,22.58,0L104,144.22l96.76-95.57a16,16,0,0,1,22.59,0l19.95,19.54A16,16,0,0,1,243.31,90.91Z"
                  fill={disabled ? '#2d6e3f' : colors.green}
                />
              </Svg>
            ) : (
              <Svg width={iconSize * 2} height={iconSize * 2} viewBox="0 -960 960 960" fill="none">
                <Path
                  d="m336-280-56-56 144-144-144-143 56-56 144 144 143-144 56 56-144 143 144 144-56 56-143-144-144 144Z"
                  fill={disabled ? '#888' : '#48484a'}
                />
              </Svg>
            )}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default memo(AnimatedSwitch);
