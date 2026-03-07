import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View,
  Animated,
  Pressable,
  type GestureResponderEvent,
} from 'react-native';

import { HandTapIcon, HandWavingIcon, HandHeartIcon } from 'phosphor-react-native';
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
    triggerHaptic('notificationError');
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
      if (haptics.blockNowHold.enabled) {
        triggerHaptic(haptics.blockNowHold.completionType);
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
      if (haptics.slideToUnlock.enabled) {
        triggerHaptic(haptics.slideToUnlock.completionType);
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

  // icon: 'pointing' (default), 'waving' (no preset), 'heart' (strict locked)
  let iconType: 'pointing' | 'waving' | 'heart' = 'pointing';
  let shouldBreathe = true;
  shouldBreatheRef.current = true;

  if (disabled && !isLocked) {
    onPress = triggerDeny;
    iconColor = colors.textMuted;
    iconType = 'waving';
    shouldBreathe = false;
    shouldBreatheRef.current = false;
  } else if (isLocked && hasActiveTimer && strictMode) {
    onPress = () => { onUnlockPress?.(); };
    iconColor = colors.text;
    iconType = 'heart';
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
              <Animated.View style={{ transform: [{ scale: handScale }] }}>
                {iconType === 'heart' ? (
                  <HandHeartIcon size={s(34)} color={iconColor} weight="fill" />
                ) : (
                  <HandTapIcon size={s(34)} color={iconColor} weight="fill" />
                )}
              </Animated.View>
            ) : (
              <HandWavingIcon size={s(34)} color={iconColor} weight="fill" />
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
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onUnlockPress === nextProps.onUnlockPress &&
    prevProps.onSlideUnlock === nextProps.onSlideUnlock
  );
});
