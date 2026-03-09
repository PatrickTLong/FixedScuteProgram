import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View,
  Animated,
  Pressable,
  type GestureResponderEvent,
} from 'react-native';

import { HandHeartIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme , shadow, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';

const DOUBLE_TAP_DELAY = 300;

interface Ripple {
  id: number;
  x: number;
  y: number;
  scale: Animated.Value;
  opacity: Animated.Value;
}

interface BlockNowButtonProps {
  onActivate: () => void;
  onUnlockPress?: () => void;
  onSlideUnlock?: () => Promise<void>;
  disabled?: boolean;
  isLocked?: boolean;
  hasActiveTimer?: boolean;
  strictMode?: boolean;
  allowEmergencyTapout?: boolean;
}

function BlockNowButton({
  onActivate,
  onUnlockPress,
  onSlideUnlock,
  disabled = false,
  isLocked = false,
  hasActiveTimer = false,
  strictMode = false,
  allowEmergencyTapout = false,
}: BlockNowButtonProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showX, setShowX] = useState(false);

  // Scale animation (like preset settings bubble)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Breathing pulse on the hand icon only
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const breatheLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startBreathe = useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    breatheLoopRef.current = loop;
    loop.start();
  }, [breatheAnim]);

  const stopBreathe = useCallback(() => {
    breatheLoopRef.current?.stop();
    breatheAnim.setValue(0);
  }, [breatheAnim]);

  const shouldBreatheState = !(disabled && !isLocked);

  useEffect(() => {
    if (shouldBreatheState) {
      startBreathe();
    } else {
      stopBreathe();
    }
    return () => breatheLoopRef.current?.stop();
  }, [shouldBreatheState, startBreathe, stopBreathe]);

  const handScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1.07],
  });

  const handOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  // Shake animation for denied taps
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch ripple pool
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<View>(null);

  const spawnRipple = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    containerRef.current?.measure((_x, _y, _w, _h, px, py) => {
      const id = ++rippleIdRef.current;
      const scale = new Animated.Value(0);
      const opacity = new Animated.Value(0.35);
      setRipples(prev => [...prev, { id, x: pageX - px, y: pageY - py, scale, opacity }]);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      });
    });
  }, []);

  // Track if breathing should be active based on state
  const shouldBreatheRef = useRef(true);

  const handlePressIn = useCallback((e: GestureResponderEvent) => {
    if (shouldBreatheRef.current) stopBreathe();
    spawnRipple(e);
    Animated.timing(scaleAnim, { toValue: 0.9, useNativeDriver: true, duration: 30 }).start();
  }, [scaleAnim, spawnRipple, stopBreathe]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
    if (shouldBreatheRef.current) startBreathe();
  }, [scaleAnim, startBreathe]);

  // Shake + show X icon for denied taps
  const triggerDeny = useCallback(() => {
    if (haptics.blockNowButton.enabled) {
      triggerHaptic(haptics.blockNowButton.denyType);
    }
    setShowX(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShowX(false), 600);
  }, [shakeAnim]);

  useEffect(() => {
    return () => { if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current); };
  }, []);

  // Double-tap tracking
  const lastTapRef = useRef<number>(0);

  const canActivate = !disabled && !isLocked;
  const showDoubleTapUnlock = isLocked && (!hasActiveTimer || !strictMode);

  const handleDoubleTapLock = useCallback(() => {
    if (!canActivate) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      console.log('[BLOCK-BTN] Double-tap DETECTED — triggering onActivate');
      lastTapRef.current = 0;
      if (haptics.blockNowButton.enabled) {
        triggerHaptic(haptics.blockNowButton.activateType);
      }
      onActivate();
    } else {
      lastTapRef.current = now;
    }
  }, [canActivate, onActivate]);

  const handleDoubleTapUnlock = useCallback(async () => {
    if (isUnlocking) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      console.log('[BLOCK-BTN] Double-tap UNLOCK DETECTED — triggering unlock');
      lastTapRef.current = 0;
      if (haptics.blockNowButton.enabled) {
        triggerHaptic(haptics.blockNowButton.unlockType);
      }
      setIsUnlocking(true);
      try {
        await onSlideUnlock?.();
      } catch (err) {
        console.log('[BLOCK-BTN] Unlock callback FAILED:', err);
      } finally {
        setIsUnlocking(false);
      }
    } else {
      lastTapRef.current = now;
    }
  }, [isUnlocking, onSlideUnlock]);

  useEffect(() => {
    lastTapRef.current = 0;
  }, [isLocked]);

  const bubbleWidth = s(120);
  const bubbleHeight = s(80);
  // Max ripple diameter needs to cover the furthest corner
  const rippleSize = Math.sqrt(bubbleWidth * bubbleWidth + bubbleHeight * bubbleHeight) * 2;

  // Pick the right handler + icon color
  let onPress: () => void;
  let iconColor: string;
  let pressDisabled = false;

  // icon: 'pointing' (default), 'waving' (no preset), 'heart' (strict+tapout), 'skull' (strict, no tapout)
  let iconType: 'pointing' | 'waving' | 'heart' | 'skull' = 'pointing';
  let shouldBreathe = true;
  shouldBreatheRef.current = true;

  if (disabled && !isLocked) {
    onPress = triggerDeny;
    iconColor = colors.textMuted;
    iconType = 'waving';
    shouldBreathe = false;
    shouldBreatheRef.current = false;
  } else if (isLocked && hasActiveTimer && strictMode && allowEmergencyTapout) {
    onPress = () => { onUnlockPress?.(); };
    iconColor = colors.text;
    iconType = 'heart';
  } else if (isLocked && hasActiveTimer && strictMode && !allowEmergencyTapout) {
    onPress = () => { onUnlockPress?.(); };
    iconColor = colors.text;
    iconType = 'skull';
  } else if (showDoubleTapUnlock) {
    onPress = handleDoubleTapUnlock;
    iconColor = isUnlocking ? colors.textMuted : colors.text;
    pressDisabled = isUnlocking;
  } else {
    onPress = handleDoubleTapLock;
    iconColor = colors.text;
  }

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-8, 0, 8],
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateX: shakeTranslate }] }}>
        <View
          ref={containerRef}
          style={{
            width: bubbleWidth,
            height: bubbleHeight,
            borderRadius: bubbleHeight / 2,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            ...shadow.card,
          }}
        >
          <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={pressDisabled}
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Ripples render behind the icon */}
            {ripples.map(r => (
              <Animated.View
                key={r.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: rippleSize,
                  height: rippleSize,
                  borderRadius: rippleSize / 2,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  left: r.x - rippleSize / 2,
                  top: r.y - rippleSize / 2,
                  transform: [{ scale: r.scale }],
                  opacity: r.opacity,
                }}
              />
            ))}
            {showX ? (
              <Svg width={s(34)} height={s(34)} viewBox="0 0 24 24" fill={colors.red}>
                <Path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0ZM5.29 5.29a9.63 9.63 0 0 1 12.23 -1 0.26 0.26 0 0 1 0 0.4L4.67 17.56a0.27 0.27 0 0 1 -0.4 0 9.49 9.49 0 0 1 1 -12.24Zm13.46 13.47a9.53 9.53 0 0 1 -12.23 1 0.26 0.26 0 0 1 0 -0.4L19.37 6.49a0.26 0.26 0 0 1 0.4 0 9.49 9.49 0 0 1 -1 12.24Z" />
              </Svg>
            ) : shouldBreathe ? (
              <Animated.View style={{ transform: [{ scale: handScale }], opacity: handOpacity }}>
                {iconType === 'heart' ? (
                  <HandHeartIcon size={s(34)} color={iconColor} weight="fill" />
                ) : iconType === 'skull' ? (
                  <Svg width={s(34)} height={s(34)} viewBox="0 0 24 24" fill={iconColor}>
                    <Path d="M4.11 9.8 3 9.05a1.26 1.26 0 0 1 -0.58 -0.82L1.8 4c0.7 0.64 1.56 1.42 2.51 2.26a8.62 8.62 0 0 1 0.59 -1.45c-1.69 -1.51 -3 -2.73 -3.61 -3.34a0.76 0.76 0 0 0 -0.87 -0.15 0.75 0.75 0 0 0 -0.42 0.78l0.9 6.37a2.75 2.75 0 0 0 1.25 1.84l2.69 1.76a7.85 7.85 0 0 1 -0.73 -2.27Z" />
                    <Path d="M24 20.29a2 2 0 0 0 -0.9 -1.24l-3.77 -2.3 0.85 -1.09a0.75 0.75 0 1 0 -1.18 -0.93l-0.93 1.19 -0.07 -0.06V16a3 3 0 0 1 -2.66 3l0.24 0.16 -0.7 0.88a0.77 0.77 0 0 0 0.12 1.02 0.74 0.74 0 0 0 0.46 0.16 0.76 0.76 0 0 0 0.6 -0.29l0.78 -1L21 22.47a2 2 0 0 0 1 0.29 2 2 0 0 0 2 -2.47Z" />
                    <Path d="M19.69 6.29c0.95 -0.84 1.81 -1.62 2.52 -2.27l-0.6 4.18a1.25 1.25 0 0 1 -0.6 0.86l-1.12 0.74a7.85 7.85 0 0 1 -0.74 2.27l2.66 -1.74a2.76 2.76 0 0 0 1.28 -1.89L24 2.1a0.75 0.75 0 0 0 -0.41 -0.78 0.76 0.76 0 0 0 -0.87 0.15c-0.59 0.61 -1.93 1.84 -3.62 3.34a7.65 7.65 0 0 1 0.59 1.48Z" />
                    <Path d="M6 16v-0.14l-0.07 0.06L5 14.73a0.75 0.75 0 1 0 -1.18 0.93l0.85 1.09 -3.77 2.3a2 2 0 0 0 -0.67 2.75 2 2 0 0 0 1.24 0.9 2 2 0 0 0 0.47 0.06 2 2 0 0 0 1 -0.29l4.17 -2.54 0.78 1a0.76 0.76 0 0 0 0.6 0.29 0.74 0.74 0 0 0 0.51 -0.16 0.77 0.77 0 0 0 0.12 -1.06l-0.7 -0.88 0.24 -0.12A3 3 0 0 1 6 16Z" />
                    <Path d="M13.5 16a1.5 1.5 0 0 0 3 0v-2.82a6.5 6.5 0 1 0 -9 0V16a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0Zm1.62 -9a1.5 1.5 0 1 1 -1.5 1.5 1.5 1.5 0 0 1 1.5 -1.5Zm-6 0a1.5 1.5 0 1 1 -1.5 1.5A1.5 1.5 0 0 1 9.12 7Z" />
                  </Svg>
                ) : (
                  <Svg width={s(34)} height={s(34)} viewBox="0 0 24 24" fill={iconColor}>
                    <Path d="M17.13 17H14.5a0.25 0.25 0 0 1 -0.25 -0.25v-6.38a2.38 2.38 0 0 0 -4.75 0v8.53a0.25 0.25 0 0 1 -0.17 0.24 0.25 0.25 0 0 1 -0.28 -0.09l-0.89 -1.24a2 2 0 0 0 -1.22 -1 2.07 2.07 0 0 0 -2.45 2.95l2.1 4A0.52 0.52 0 0 0 7 24h14.25a0.51 0.51 0 0 0 0.5 -0.5v-1.66A4.8 4.8 0 0 0 17.13 17Z" />
                    <Path d="M11.75 5a1 1 0 0 0 1 -1V1a1 1 0 0 0 -2 0v3a1 1 0 0 0 1 1Z" />
                    <Path d="m16.35 6.32 2.12 -2.13a1 1 0 0 0 0 -1.41 1 1 0 0 0 -1.42 0L14.93 4.9a1 1 0 0 0 1.42 1.42Z" />
                    <Path d="M16.25 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 0 -2h-3a1 1 0 0 0 -1 1Z" />
                    <Path d="M7.15 6.32A1 1 0 0 0 8.57 4.9L6.45 2.78a1 1 0 0 0 -1.45 0 1 1 0 0 0 0 1.41Z" />
                    <Path d="M7.25 9.5a1 1 0 0 0 -1 -1h-3a1 1 0 0 0 0 2h3a1 1 0 0 0 1 -1Z" />
                  </Svg>
                )}
              </Animated.View>
            ) : (
              <Svg width={s(34)} height={s(34)} viewBox="0 0 24 24" fill={iconColor}>
                <Path d="M17.13 17H14.5a0.25 0.25 0 0 1 -0.25 -0.25v-6.38a2.38 2.38 0 0 0 -4.75 0v8.53a0.25 0.25 0 0 1 -0.17 0.24 0.25 0.25 0 0 1 -0.28 -0.09l-0.89 -1.24a2 2 0 0 0 -1.22 -1 2.07 2.07 0 0 0 -2.45 2.95l2.1 4A0.52 0.52 0 0 0 7 24h14.25a0.51 0.51 0 0 0 0.5 -0.5v-1.66A4.8 4.8 0 0 0 17.13 17Z" />
                <Path d="M11.75 5a1 1 0 0 0 1 -1V1a1 1 0 0 0 -2 0v3a1 1 0 0 0 1 1Z" />
                <Path d="m16.35 6.32 2.12 -2.13a1 1 0 0 0 0 -1.41 1 1 0 0 0 -1.42 0L14.93 4.9a1 1 0 0 0 1.42 1.42Z" />
                <Path d="M16.25 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 0 -2h-3a1 1 0 0 0 -1 1Z" />
                <Path d="M7.15 6.32A1 1 0 0 0 8.57 4.9L6.45 2.78a1 1 0 0 0 -1.45 0 1 1 0 0 0 0 1.41Z" />
                <Path d="M7.25 9.5a1 1 0 0 0 -1 -1h-3a1 1 0 0 0 0 2h3a1 1 0 0 0 1 -1Z" />
              </Svg>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default memo(BlockNowButton, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.isLocked === nextProps.isLocked &&
    prevProps.hasActiveTimer === nextProps.hasActiveTimer &&
    prevProps.strictMode === nextProps.strictMode &&
    prevProps.allowEmergencyTapout === nextProps.allowEmergencyTapout &&
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onUnlockPress === nextProps.onUnlockPress &&
    prevProps.onSlideUnlock === nextProps.onSlideUnlock
  );
});
