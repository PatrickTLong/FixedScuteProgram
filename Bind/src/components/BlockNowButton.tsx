import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { lightTap, mediumTap, successTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

// Slide thumb component with chevron arrow
interface SlideThumbProps {
  size?: number;
}

function SlideThumb({ size = 32 }: SlideThumbProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}

const HOLD_DURATION = 3000; // 3 seconds
const SCREEN_WIDTH = Dimensions.get('window').width;
const BASE_BUTTON_HORIZONTAL_PADDING = 48; // px-6 = 24px * 2 from parent

interface BlockNowButtonProps {
  onActivate: () => void;
  onUnlockPress?: () => void;
  onSlideUnlock?: () => Promise<void>;
  disabled?: boolean;
  isLocked?: boolean;
  hasActiveTimer?: boolean; // true when there's a countdown or elapsed time showing
  strictMode?: boolean; // when false, slide-to-unlock is available even for timed presets
}

function BlockNowButton({
  onActivate,
  onUnlockPress,
  onSlideUnlock,
  disabled = false,
  isLocked = false,
  hasActiveTimer = false,
  strictMode = false,
}: BlockNowButtonProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const buttonHorizontalPadding = s(BASE_BUTTON_HORIZONTAL_PADDING);
  const [isPressed, setIsPressed] = useState(false);
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slide to unlock state
  const [isSliding, setIsSliding] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const slidePosition = useRef(new Animated.Value(0)).current;
  const [buttonWidth, setButtonWidth] = useState(SCREEN_WIDTH - buttonHorizontalPadding);
  const hapticTriggeredRef = useRef({ first: false, second: false, third: false });

  // Can activate only when not disabled and not locked
  const canActivate = !disabled && !isLocked;

  // Store refs for PanResponder to avoid dependency changes
  const canActivateRef = useRef(canActivate);
  canActivateRef.current = canActivate;

  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const onSlideUnlockRef = useRef(onSlideUnlock);
  onSlideUnlockRef.current = onSlideUnlock;

  const buttonWidthRef = useRef(buttonWidth);
  useEffect(() => {
    buttonWidthRef.current = buttonWidth;
  }, [buttonWidth]);

  const isUnlockingRef = useRef(isUnlocking);
  useEffect(() => {
    isUnlockingRef.current = isUnlocking;
  }, [isUnlocking]);

  // Determine if we should show slide-to-unlock
  // Show slide-to-unlock when:
  // 1. Locked with no active timer (no time limit preset) - always slide-to-unlock
  // 2. Locked with active timer BUT strictMode is OFF - slide-to-unlock available
  const showSlideToUnlock = isLocked && (!hasActiveTimer || !strictMode);

  // Reset slide position when switching modes
  useEffect(() => {
    if (!showSlideToUnlock) {
      slidePosition.setValue(0);
      hapticTriggeredRef.current = { first: false, second: false, third: false };
    }
  }, [showSlideToUnlock, slidePosition]);

  // Hold-to-lock animation functions
  const startAnimation = useCallback(() => {
    if (!canActivateRef.current) return;

    mediumTap();
    setIsPressed(true);
    fillAnimation.setValue(0);

    hapticIntervalRef.current = setInterval(() => {
      lightTap();
    }, 1000);

    animationRef.current = Animated.timing(fillAnimation, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }

      if (finished) {
        successTap();
        onActivateRef.current();
        setIsPressed(false);
        fillAnimation.setValue(0);
      }
    });
  }, [fillAnimation]);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }

    setIsPressed(false);

    Animated.timing(fillAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [fillAnimation]);

  // Slide-to-unlock functions
  const resetSlider = useCallback(() => {
    hapticTriggeredRef.current = { first: false, second: false, third: false };
    setIsSliding(false);
    Animated.spring(slidePosition, {
      toValue: 0,
      useNativeDriver: false,
      friction: 5,
    }).start();
  }, [slidePosition]);

  const handleSlideComplete = useCallback(async () => {
    setIsUnlocking(true);
    isUnlockingRef.current = true;
    successTap();
    try {
      if (onSlideUnlockRef.current) {
        await onSlideUnlockRef.current();
      }
    } finally {
      setIsUnlocking(false);
      isUnlockingRef.current = false;
      setIsSliding(false);
      slidePosition.setValue(0);
      hapticTriggeredRef.current = { first: false, second: false, third: false };
    }
  }, [slidePosition]);

  const handleSlideCompleteRef = useRef(handleSlideComplete);
  const resetSliderRef = useRef(resetSlider);

  useEffect(() => {
    handleSlideCompleteRef.current = handleSlideComplete;
    resetSliderRef.current = resetSlider;
  }, [handleSlideComplete, resetSlider]);

  // Hold-to-lock PanResponder
  const holdPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canActivateRef.current,
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

  // Slide-to-unlock PanResponder
  const slidePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isUnlockingRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal movement
        return !isUnlockingRef.current && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        mediumTap();
        setIsSliding(true);
        hapticTriggeredRef.current = { first: false, second: false, third: false };
      },
      onPanResponderMove: (_, gestureState) => {
        const maxSlide = buttonWidthRef.current;
        const newPosition = Math.max(0, Math.min(gestureState.dx, maxSlide));
        slidePosition.setValue(newPosition);

        // Calculate progress percentage
        const progress = newPosition / maxSlide;

        // Haptic feedback at 33%, 66%, and 90% thresholds
        if (progress >= 0.33 && !hapticTriggeredRef.current.first) {
          hapticTriggeredRef.current.first = true;
          lightTap();
        }
        if (progress >= 0.66 && !hapticTriggeredRef.current.second) {
          hapticTriggeredRef.current.second = true;
          lightTap();
        }
        if (progress >= 0.90 && !hapticTriggeredRef.current.third) {
          hapticTriggeredRef.current.third = true;
          mediumTap();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxSlide = buttonWidthRef.current;
        const currentPosition = Math.max(0, Math.min(gestureState.dx, maxSlide));

        if (currentPosition >= maxSlide * 0.85) {
          // Slid far enough - unlock
          handleSlideCompleteRef.current();
        } else {
          // Not far enough - reset
          resetSliderRef.current();
        }
      },
      onPanResponderTerminate: () => {
        resetSliderRef.current();
      },
    })
  ).current;

  // Interpolate fill width for hold-to-lock
  const fillWidth = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const fillColor = '#4ade80';

  const getTextColor = () => {
    if (isLocked) return colors.text;
    if (!canActivate) return colors.textMuted;
    if (isPressed) return colors.text;
    return colors.text;
  };

  // When locked with active timer AND strict mode is ON, show tappable "Locked" button with static glow and dimmed background
  if (isLocked && hasActiveTimer && strictMode) {
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
          opacity: 0.6,
        }}
      >
        <View className="flex-1 flex-row items-center justify-center">
          <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Locked</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // When locked without timer (no time limit), show slide-to-unlock
  if (showSlideToUnlock) {
    const thumbSize = 32;
    const thumbMargin = 6;

    // Green fill only appears when sliding - starts from 0 and grows with slide
    const slideFillWidth = slidePosition.interpolate({
      inputRange: [0, buttonWidth],
      outputRange: [0, buttonWidth],
      extrapolate: 'clamp',
    });

    return (
      <View
        onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
        {...slidePanResponder.panHandlers}
        className="h-14 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: colors.card,
        }}
      >
        {/* Button Content - rendered first so it's behind the fill */}
        <View className="flex-1 flex-row items-center justify-center" style={{ zIndex: 1 }}>
          <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
            {isUnlocking ? 'Unlocking...' : isSliding ? 'Slide...' : 'Slide to Unlock'}
          </Text>
        </View>

        {/* Slide fill animation - only visible when sliding, rendered on top to cover text */}
        {isSliding && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: slideFillWidth,
              backgroundColor: fillColor,
              borderRadius: 16,
              zIndex: 2,
            }}
          />
        )}

        {/* Slide thumb (white arrow) that moves with the gesture */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: thumbMargin,
            justifyContent: 'center',
            transform: [{ translateX: slidePosition }],
            zIndex: 3,
          }}
          pointerEvents="none"
        >
          <SlideThumb size={thumbSize} />
        </Animated.View>
      </View>
    );
  }

  // Default: Hold to begin locking
  return (
    <View
      {...(canActivate ? holdPanResponder.panHandlers : {})}
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
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.hasActiveTimer === nextProps.hasActiveTimer &&
    prevProps.strictMode === nextProps.strictMode &&
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onUnlockPress === nextProps.onUnlockPress &&
    prevProps.onSlideUnlock === nextProps.onSlideUnlock
  );
});
