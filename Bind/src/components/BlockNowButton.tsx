import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTap, mediumTap, successTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

const HOLD_DURATION = 3000; // 3 seconds

interface BlockNowButtonProps {
  onActivate: () => void;
  onUnlockPress?: () => void;
  disabled?: boolean;
  isRegistered?: boolean;
  isLocked?: boolean;
  hasActiveTimer?: boolean; // true when there's a countdown or elapsed time showing
}

function BlockNowButton({ onActivate, onUnlockPress, disabled = false, isRegistered = false, isLocked = false, hasActiveTimer = false }: BlockNowButtonProps) {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Can activate only when registered, not disabled, and not locked
  const canActivate = !disabled && isRegistered && !isLocked;

  // Store canActivate in ref for PanResponder to avoid dependency changes
  const canActivateRef = useRef(canActivate);
  canActivateRef.current = canActivate;

  // Store onActivate in ref to avoid dependency changes in PanResponder
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const startAnimation = useCallback(() => {
    if (!canActivateRef.current) return;

    mediumTap(); // Haptic on press start
    setIsPressed(true);
    fillAnimation.setValue(0);

    // Start per-second haptic feedback
    hapticIntervalRef.current = setInterval(() => {
      lightTap();
    }, 1000);

    animationRef.current = Animated.timing(fillAnimation, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      // Clear haptic interval
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }

      if (finished) {
        // Successfully held for 3 seconds - activate blocking
        successTap(); // Success haptic
        onActivateRef.current();
        setIsPressed(false);
        // Reset the fill animation
        fillAnimation.setValue(0);
      }
    });
  }, [fillAnimation]);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Clear haptic interval
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }

    setIsPressed(false);

    // Animate back to 0
    Animated.timing(fillAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [fillAnimation]);

  // Create panResponder with useMemo - use refs to avoid dependency changes
  // This prevents recreation on every parent re-render (timer updates)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          return canActivateRef.current;
        },
        onMoveShouldSetPanResponder: () => false,
        onPanResponderGrant: () => {
          startAnimation();
        },
        onPanResponderRelease: () => {
          cancelAnimation();
        },
        onPanResponderTerminate: () => {
          cancelAnimation();
        },
      }),
    [startAnimation, cancelAnimation]
  );

  // Interpolate fill width
  const fillWidth = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Green color for fill when registered
  const fillColor = colors.green;

  const getTextColor = () => {
    if (!isRegistered) return colors.text; // white/dark for register button
    if (isLocked) return colors.text; // normal text when locked
    if (!canActivate) return colors.textMuted; // muted when disabled (no preset)
    if (isPressed) return colors.text; // white in dark mode, dark in light mode during hold
    return colors.text; // clean text color
  };

  // If not registered, render a simple TouchableOpacity for tapping
  if (!isRegistered) {
    return (
      <TouchableOpacity
        onPress={() => { lightTap(); onActivate(); }}
        activeOpacity={0.7}
        className="h-14 rounded-2xl overflow-hidden"
        style={{ backgroundColor: colors.card }}
      >
        <View className="flex-1 flex-row items-center justify-center">
          <Text
            style={{ color: getTextColor() }}
            className="text-base font-nunito-semibold"
          >
            Register Scute
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // When locked, render a tappable button to show unlock modal
  if (isLocked) {
    return (
      <TouchableOpacity
        onPress={() => {
          lightTap();
          onUnlockPress?.();
        }}
        activeOpacity={0.7}
        className="h-14 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: colors.card,
        }}
      >
        <View className="flex-1 flex-row items-center justify-center">
          {/* Lock Icon */}
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
            <Path
              d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
              stroke={colors.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text
            style={{ color: colors.text }}
            className="text-base font-nunito-semibold"
          >
            {hasActiveTimer ? 'Locked' : 'Tap to Unlock'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      {...(canActivate ? panResponder.panHandlers : {})}
      className="h-14 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: colors.card,
        borderWidth: 0,
      }}
    >
      {/* Fill Animation */}
      {canActivate && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: fillWidth,
            backgroundColor: fillColor,
            borderRadius: 16,
          }}
        />
      )}

      {/* Button Content */}
      <View className="flex-1 flex-row items-center justify-center">
        <Text
          style={{ color: getTextColor() }}
          className="text-base font-nunito-semibold"
        >
          {isPressed ? 'Hold...' : 'Hold to Begin Locking'}
        </Text>
      </View>
    </View>
  );
}

// Custom comparison to prevent re-renders when props haven't actually changed
export default memo(BlockNowButton, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.isRegistered === nextProps.isRegistered &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.hasActiveTimer === nextProps.hasActiveTimer &&
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onUnlockPress === nextProps.onUnlockPress
  );
});
