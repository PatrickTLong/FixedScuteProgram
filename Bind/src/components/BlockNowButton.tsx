import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path, Text as SvgText, Defs, Filter, FeGaussianBlur } from 'react-native-svg';
import { lightTap, mediumTap, successTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

// Glowing text component using SVG blur filter (animated)
interface GlowTextProps {
  text: string;
  color: string;
  glowOpacity: Animated.Value;
  fontSize?: number;
}

function GlowText({ text, color, glowOpacity, fontSize = 16 }: GlowTextProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const listenerId = glowOpacity.addListener(({ value }) => {
      setOpacity(value);
    });
    return () => glowOpacity.removeListener(listenerId);
  }, [glowOpacity]);

  // Estimate text width (rough approximation)
  const textWidth = text.length * fontSize * 0.6;
  const svgWidth = textWidth + 40; // padding for glow
  const svgHeight = fontSize + 30;

  return (
    <View style={{ width: svgWidth, height: svgHeight, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={svgWidth} height={svgHeight} style={{ position: 'absolute' }}>
        <Defs>
          <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </Filter>
        </Defs>
        {/* Glow layer */}
        <SvgText
          x={svgWidth / 2}
          y={svgHeight / 2 + fontSize / 3}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="Nunito-SemiBold"
          fill="#ffffff"
          opacity={opacity}
          filter="url(#glow)"
        >
          {text}
        </SvgText>
        {/* Main text layer */}
        <SvgText
          x={svgWidth / 2}
          y={svgHeight / 2 + fontSize / 3}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="Nunito-SemiBold"
          fill={color}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

// Static glow text component (no animation, constant glow)
interface StaticGlowTextProps {
  text: string;
  color: string;
  fontSize?: number;
  glowOpacity?: number;
}

function StaticGlowText({ text, color, fontSize = 16, glowOpacity = 1 }: StaticGlowTextProps) {
  // Estimate text width (rough approximation)
  const textWidth = text.length * fontSize * 0.6;
  const svgWidth = textWidth + 40; // padding for glow
  const svgHeight = fontSize + 30;

  return (
    <View style={{ width: svgWidth, height: svgHeight, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={svgWidth} height={svgHeight} style={{ position: 'absolute' }}>
        <Defs>
          <Filter id="staticGlow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </Filter>
        </Defs>
        {/* Glow layer */}
        <SvgText
          x={svgWidth / 2}
          y={svgHeight / 2 + fontSize / 3}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="Nunito-SemiBold"
          fill="#ffffff"
          opacity={glowOpacity}
          filter="url(#staticGlow)"
        >
          {text}
        </SvgText>
        {/* Main text layer */}
        <SvgText
          x={svgWidth / 2}
          y={svgHeight / 2 + fontSize / 3}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="Nunito-SemiBold"
          fill={color}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

const HOLD_DURATION = 3000; // 3 seconds
const SCREEN_WIDTH = Dimensions.get('window').width;
const BUTTON_HORIZONTAL_PADDING = 48; // px-6 = 24px * 2 from parent

interface BlockNowButtonProps {
  onActivate: () => void;
  onUnlockPress?: () => void;
  onSlideUnlock?: () => Promise<void>;
  disabled?: boolean;
  isLocked?: boolean;
  hasActiveTimer?: boolean; // true when there's a countdown or elapsed time showing
  hasReadyPreset?: boolean; // true when there's a preset ready to lock (enables glow)
  strictMode?: boolean; // when false, slide-to-unlock is available even for timed presets
}

function BlockNowButton({
  onActivate,
  onUnlockPress,
  onSlideUnlock,
  disabled = false,
  isLocked = false,
  hasActiveTimer = false,
  hasReadyPreset = false,
  strictMode = false,
}: BlockNowButtonProps) {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsating glow animation
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Slide to unlock state
  const [isSliding, setIsSliding] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const slidePosition = useRef(new Animated.Value(0)).current;
  const [buttonWidth, setButtonWidth] = useState(SCREEN_WIDTH - BUTTON_HORIZONTAL_PADDING);
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

  // Log for debugging
  console.log('[BlockNowButton] State:', { isLocked, hasActiveTimer, strictMode, showSlideToUnlock });

  // Slow pulsating glow for ready preset (hold to lock) and slide to unlock
  const shouldShowSlowGlow = (hasReadyPreset && !isLocked) || showSlideToUnlock;

  useEffect(() => {
    if (shouldShowSlowGlow && !isPressed) {
      // Start slow pulsating animation (2 second cycle)
      glowAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      glowAnimationRef.current.start();
    } else {
      // Stop animation
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
        glowAnimationRef.current = null;
      }
      glowOpacity.setValue(0);
    }

    return () => {
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
        glowAnimationRef.current = null;
      }
    };
  }, [shouldShowSlowGlow, isPressed, glowOpacity]);

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

  // Interpolate slide fill width
  const slideFillWidth = slidePosition.interpolate({
    inputRange: [0, buttonWidth],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const fillColor = colors.green;

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
          <StaticGlowText text="Locked" color={colors.text} />
        </View>
      </TouchableOpacity>
    );
  }

  // When locked without timer (no time limit), show slide-to-unlock
  if (showSlideToUnlock) {
    return (
      <View
        onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
        {...slidePanResponder.panHandlers}
        className="h-14 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: colors.card,
        }}
      >
        {/* Slide fill animation - same style as hold-to-lock */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: slideFillWidth,
            backgroundColor: fillColor,
            borderRadius: 16,
          }}
        />

        {/* Arrow that travels with the green bar - clips at button edge */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            transform: [{ translateX: slidePosition }],
            paddingLeft: 4,
            opacity: 0.5,
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M9 18l6-6-6-6"
              stroke={colors.text}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Button Content */}
        <View className="flex-1 flex-row items-center justify-center">
          <Text
            style={{ color: colors.text }}
            className="text-base font-nunito-semibold"
          >
            {isUnlocking ? 'Unlocking...' : isSliding ? 'Slide...' : 'Slide to Unlock'}
          </Text>
        </View>
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
        {shouldShowSlowGlow ? (
          <GlowText
            text={isPressed ? 'Hold...' : 'Hold to Begin Locking'}
            color={getTextColor()}
            glowOpacity={glowOpacity}
          />
        ) : (
          <Text
            style={{ color: getTextColor() }}
            className="text-base font-nunito-semibold"
          >
            {isPressed ? 'Hold...' : 'Hold to Begin Locking'}
          </Text>
        )}
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
    prevProps.hasReadyPreset === nextProps.hasReadyPreset &&
    prevProps.strictMode === nextProps.strictMode &&
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onUnlockPress === nextProps.onUnlockPress &&
    prevProps.onSlideUnlock === nextProps.onSlideUnlock
  );
});
