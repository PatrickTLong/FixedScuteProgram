import React, { memo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LoadingSpinner from './LoadingSpinner';
import { useTheme , textSize, fontFamily, radius, shadow, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

import { useResponsive } from '../utils/responsive';

interface EmergencyTapoutModalProps {
  visible: boolean;
  onClose: () => void;
  onUseTapout: () => void;
  presetAllowsTapout: boolean;
  tapoutsRemaining: number;
  isLoading?: boolean;
  lockEndsAt?: string | null;
}

function EmergencyTapoutModal({
  visible,
  onClose,
  onUseTapout,
  presetAllowsTapout,
  tapoutsRemaining,
  isLoading = false,
  lockEndsAt,
}: EmergencyTapoutModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissFlash = useRef(new Animated.Value(0)).current;
  const tapoutFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dismissFlash.stopAnimation(() => dismissFlash.setValue(0));
    tapoutFlash.stopAnimation(() => tapoutFlash.setValue(0));
  }, [visible]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
  }, []);

  const releaseFlash = useCallback((anim: Animated.Value) => {
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  // Heartbeat animation
  const heartBeat = useRef(new Animated.Value(1)).current;
  const canUseTapout = presetAllowsTapout && tapoutsRemaining > 0;
  const iconSize = 34;

  useEffect(() => {
    if (!canUseTapout || !visible) {
      heartBeat.setValue(1);
      return;
    }
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeat, { toValue: 1.15, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartBeat, { toValue: 1, duration: 80, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(60),
        Animated.timing(heartBeat, { toValue: 1.1, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartBeat, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [heartBeat, canUseTapout, visible]);

  // Auto-close modal when timer expires
  useEffect(() => {
    if (!visible || !lockEndsAt) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const endTime = new Date(lockEndsAt).getTime();
    const now = Date.now();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      // Timer already expired, close modal
      onClose();
      return;
    }

    // Set timeout to close modal when timer expires
    timerRef.current = setTimeout(() => {
      onClose();
    }, timeLeft);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, lockEndsAt, onClose]);


  const getUnavailableReason = () => {
    if (!presetAllowsTapout) {
      return 'Emergency tapouts are not enabled for this preset.';
    }
    if (tapoutsRemaining === 0) {
      return 'You have no tapouts remaining.';
    }
    return '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1, borderColor: colors.border,
            ...shadow.modal,
          }}
          className={`w-full ${radius['2xl']} overflow-hidden`}
        >
          {/* Content */}
          <View className="p-6 items-center">
            {canUseTapout ? (
              <Animated.View style={{ marginBottom: 12, transform: [{ scale: heartBeat }], opacity: heartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                <Svg width={iconSize} height={iconSize} viewBox="0 -960 960 960" fill={colors.red}>
                  <Path d="M595-468h-230q0 170 115 170t115-170ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM480-120l-58-50q-101-88-167-152T150-437q-39-51-54.5-94T80-620q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 89T810-437q-39 51-105 115T538-170l-58 50Z" />
                </Svg>
              </Animated.View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={colors.textMuted}>
                  <Path d="M12 0.5a10 10 0 0 0 -10 10V13a5.49 5.49 0 0 0 3.2 5 2 2 0 0 1 1 2.48c-0.64 1.82 -0.91 2.17 -0.43 2.7a1 1 0 0 0 0.74 0.33h2A0.5 0.5 0 0 0 9 23v-2a1 1 0 0 1 2 0v2a0.5 0.5 0 0 0 0.5 0.5h1a0.5 0.5 0 0 0 0.5 -0.5v-2a1 1 0 0 1 2 0v2a0.5 0.5 0 0 0 0.5 0.5h1.95a1 1 0 0 0 0.74 -0.33c0.48 -0.53 0.22 -0.87 -0.43 -2.7a2 2 0 0 1 1 -2.48A5.49 5.49 0 0 0 22 13v-2.5a10 10 0 0 0 -10 -10Zm-4.5 14A2.5 2.5 0 1 1 10 12a2.5 2.5 0 0 1 -2.5 2.51Zm5.68 2.76a0.51 0.51 0 0 1 -0.43 0.24h-1.5a0.49 0.49 0 0 1 -0.42 -0.24 0.5 0.5 0 0 1 0 -0.49l0.75 -1.5a0.52 0.52 0 0 1 0.9 0l0.75 1.5a0.5 0.5 0 0 1 -0.05 0.5Zm3.32 -2.76A2.5 2.5 0 1 1 19 12a2.5 2.5 0 0 1 -2.5 2.51Z" />
                </Svg>
              </View>
            )}

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-3`}>
              Emergency Tapout
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center`}>
              {canUseTapout
                ? `You have ${tapoutsRemaining} tapout${tapoutsRemaining !== 1 ? 's' : ''} remaining.`
                : getUnavailableReason()}
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
            <TouchableOpacity
              onPressIn={() => triggerFlash(dismissFlash)}
              onPressOut={() => releaseFlash(dismissFlash)}
              onPress={onClose}
              activeOpacity={1}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center justify-center"
            >
              <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: dismissFlash }} />
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Dismiss
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPressIn={() => triggerFlash(tapoutFlash)}
              onPressOut={() => releaseFlash(tapoutFlash)}
              onPress={() => { if (haptics.blockNowButton.enabled) triggerHaptic(haptics.blockNowButton.unlockType); onUseTapout(); }}
              disabled={!canUseTapout || isLoading}
              activeOpacity={1}
              className="flex-1 py-4 items-center justify-center"
            >
              {isLoading ? (
                <LoadingSpinner size={s(22)} color={colors.textMuted} />
              ) : (
                <>
                  <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: tapoutFlash }} />
                  <Text style={{ color: canUseTapout ? colors.text : colors.textMuted, opacity: canUseTapout ? 1 : 0.6 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Unlock
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(EmergencyTapoutModal);
