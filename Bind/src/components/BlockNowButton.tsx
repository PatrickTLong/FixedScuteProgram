import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import { useTheme , textSize, fontFamily, radius, shadow, colors, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';

const HOLD_DURATION = 1000; // 1 second
const SCREEN_WIDTH = Dimensions.get('window').width;
const BASE_BUTTON_HORIZONTAL_PADDING = 48; // px-6 = 24px * 2 from parent
const FILL_COLOR = colors.green;

interface BlockNowButtonProps {
  onActivate: () => void;
  onUnlockPress?: () => void;
  onSlideUnlock?: () => Promise<void>;
  disabled?: boolean;
  isLocked?: boolean;
  hasActiveTimer?: boolean; // true when there's a countdown or elapsed time showing
  strictMode?: boolean; // when false, slide-to-unlock is available even for timed presets
  onInteractionChange?: (interacting: boolean) => void;
}

function BlockNowButton({
  onActivate,
  onUnlockPress,
  onSlideUnlock,
  disabled = false,
  isLocked = false,
  hasActiveTimer = false,
  strictMode = false,
  onInteractionChange,
}: BlockNowButtonProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const buttonHorizontalPadding = s(BASE_BUTTON_HORIZONTAL_PADDING);
  const [isPressed, setIsPressed] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Haptic tracking refs
  const holdHalfwayFired = useRef(false);

  // Slide state — ref-only to avoid re-renders during drag
  const slidePosition = useRef(new Animated.Value(0)).current;
  const buttonWidthRef = useRef(SCREEN_WIDTH - buttonHorizontalPadding);

  // Can activate only when not disabled and not locked
  const canActivate = !disabled && !isLocked;

  // Stable refs for PanResponder closures (inline assignment, no useEffect needed)
  const canActivateRef = useRef(canActivate);
  canActivateRef.current = canActivate;
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const onSlideUnlockRef = useRef(onSlideUnlock);
  onSlideUnlockRef.current = onSlideUnlock;
  const onInteractionChangeRef = useRef(onInteractionChange);
  onInteractionChangeRef.current = onInteractionChange;
  const isUnlockingRef = useRef(isUnlocking);
  isUnlockingRef.current = isUnlocking;

  // Determine if we should show slide-to-unlock
  // Show slide-to-unlock when:
  // 1. Locked with no active timer (no time limit preset) - always slide-to-unlock
  // 2. Locked with active timer BUT strictMode is OFF - slide-to-unlock available
  const showSlideToUnlock = isLocked && (!hasActiveTimer || !strictMode);

  // Reset slide position when switching modes
  useEffect(() => {
    if (!showSlideToUnlock) {
      slidePosition.setValue(0);
    }
  }, [showSlideToUnlock, slidePosition]);

  // Hold-to-lock animation functions
  const startAnimation = useCallback(() => {
    if (!canActivateRef.current) return;

    setIsPressed(true);
    fillAnimation.setValue(0);
    holdHalfwayFired.current = false;

    // Listen for halfway progress to trigger haptic
    const listenerId = fillAnimation.addListener(({ value }) => {
      if (haptics.blockNowHold.enabled && !holdHalfwayFired.current && value >= 0.5) {
        holdHalfwayFired.current = true;
        triggerHaptic(haptics.blockNowHold.halfwayType);
      }
    });

    animationRef.current = Animated.timing(fillAnimation, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      fillAnimation.removeListener(listenerId);
      if (finished) {
        if (haptics.blockNowHold.enabled) {
          triggerHaptic(haptics.blockNowHold.completionType);
        }
        onActivateRef.current();
        setIsPressed(false);
        fillAnimation.setValue(0);
      }
    });
  }, [fillAnimation]);

  const cancelAnimation = useCallback(() => {
    animationRef.current?.stop();
    setIsPressed(false);
    Animated.timing(fillAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [fillAnimation]);

  // Slide-to-unlock functions
  const resetSlider = useCallback(() => {
    Animated.spring(slidePosition, {
      toValue: 0,
      useNativeDriver: false,
      friction: 5,
    }).start();
  }, [slidePosition]);

  const handleSlideComplete = useCallback(async () => {
    if (haptics.slideToUnlock.enabled) {
      triggerHaptic(haptics.slideToUnlock.completionType);
    }
    setIsUnlocking(true);
    isUnlockingRef.current = true;
    try {
      await onSlideUnlockRef.current?.();
    } finally {
      setIsUnlocking(false);
      isUnlockingRef.current = false;
      slidePosition.setValue(0);
    }
  }, [slidePosition]);

  // Keep refs fresh for PanResponder (inline, no useEffect)
  const handleSlideCompleteRef = useRef(handleSlideComplete);
  handleSlideCompleteRef.current = handleSlideComplete;
  const resetSliderRef = useRef(resetSlider);
  resetSliderRef.current = resetSlider;

  // Hold-to-lock PanResponder
  const holdPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canActivateRef.current,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderGrant: () => { onInteractionChangeRef.current?.(true); startAnimation(); },
        onPanResponderRelease: () => { onInteractionChangeRef.current?.(false); cancelAnimation(); },
        onPanResponderTerminate: () => { onInteractionChangeRef.current?.(false); cancelAnimation(); },
      }),
    [startAnimation, cancelAnimation]
  );

  // Slide-to-unlock PanResponder
  const slidePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isUnlockingRef.current,
      onMoveShouldSetPanResponder: (_, g) => !isUnlockingRef.current && Math.abs(g.dx) > 5,
      onPanResponderGrant: () => {
          onInteractionChangeRef.current?.(true);
        },
      onPanResponderMove: (_, g) => {
        const maxSlide = buttonWidthRef.current;
        const pos = Math.max(0, Math.min(g.dx, maxSlide));
        slidePosition.setValue(pos);
      },
      onPanResponderRelease: (_, g) => {
        onInteractionChangeRef.current?.(false);
        const maxSlide = buttonWidthRef.current;
        const pos = Math.max(0, Math.min(g.dx, maxSlide));
        if (pos >= maxSlide * 0.85) {
          handleSlideCompleteRef.current();
        } else {
          resetSliderRef.current();
        }
      },
      onPanResponderTerminate: () => { onInteractionChangeRef.current?.(false); resetSliderRef.current(); },
    })
  ).current;

  // Interpolate fill width for hold-to-lock
  const fillWidth = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getTextColor = () => {
    if (!canActivate) return colors.textMuted;
    return colors.text;
  };

  // When locked with active timer AND strict mode is ON, show tappable "Locked" button with static glow and dimmed background
  if (isLocked && hasActiveTimer && strictMode) {
    return (
      <TouchableOpacity
        onPress={() => onUnlockPress?.()}
        activeOpacity={0.7}
        className={`h-14 ${radius.full} overflow-hidden`}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.card,
        }}
      >
        <View className="flex-1 flex-row items-center justify-center">
          <Text style={{ color: colors.textMuted }} className={`${textSize.small} ${fontFamily.semibold}`}>Locked</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // When locked without timer (no time limit), show slide-to-unlock
  if (showSlideToUnlock) {
    // Green fill only appears when sliding - starts from 0 and grows with slide
    const slideFillWidth = slidePosition.interpolate({
      inputRange: [0, buttonWidthRef.current],
      outputRange: [0, buttonWidthRef.current],
      extrapolate: 'clamp',
    });

    return (
      <View
        onLayout={(e) => { buttonWidthRef.current = e.nativeEvent.layout.width; }}
        {...slidePanResponder.panHandlers}
        className={`h-14 ${radius.full} overflow-hidden`}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow.card,
        }}
      >
        {/* Text - always visible, positioned below the fill */}
        <View className="flex-1 flex-row items-center justify-center" style={{ zIndex: 1 }}>
          <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
            {isUnlocking ? 'Unlocking...' : 'Slide to Unlock'}
          </Text>
        </View>

        {/* Slide fill animation - overlaps the text */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: slideFillWidth,
            backgroundColor: FILL_COLOR,
            borderRadius: s(28),
            zIndex: 2,
          }}
        />
      </View>
    );
  }

  // Default: Hold to begin locking
  return (
    <View
      {...(canActivate ? holdPanResponder.panHandlers : {})}
      className={`h-14 ${radius.full} overflow-hidden`}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadow.card,
      }}
    >
      {/* Button Content */}
      <View className="flex-1 flex-row items-center justify-center" style={{ zIndex: 1 }}>
        <Text
          style={{ color: getTextColor() }}
          className={`${textSize.small} ${fontFamily.semibold}`}
        >
          {isPressed ? 'Hold...' : 'Hold to Begin Locking'}
        </Text>
      </View>

      {/* Fill Animation */}
      {canActivate && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: fillWidth,
            backgroundColor: FILL_COLOR,
            borderRadius: s(28),
            zIndex: 2,
          }}
        />
      )}
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
