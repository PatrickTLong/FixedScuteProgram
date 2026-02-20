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
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';

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
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  // Pulse sweep animation
  const pulseSweep = useRef(new Animated.Value(0)).current;
  const canUseTapout = presetAllowsTapout && tapoutsRemaining > 0;
  const pulseIconSize = 34;

  useEffect(() => {
    if (!canUseTapout || !visible) {
      pulseSweep.setValue(0);
      return;
    }
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSweep, { toValue: 1, duration: 600, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );
    wave.start();
    return () => wave.stop();
  }, [pulseSweep, canUseTapout, visible]);

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
              <View style={{ width: pulseIconSize, height: pulseIconSize, overflow: 'hidden', marginBottom: 12 }}>
                <Svg width={pulseIconSize} height={pulseIconSize} viewBox="0 0 24 24" fill={colors.textMuted}>
                  <Path d="M20 19H4v2h16zM13 6V3h-2v3zm6 5v2h3v-2zM5 13v-2H2v2zm12.66-5.24 1.06-1.06 1.06-1.06-.71-.71-.71-.71-1.06 1.06-1.06 1.06.71.71zm-11.32 0 .71-.71.71-.71L6.7 5.28 5.64 4.22l-.71.71-.71.71L5.28 6.7zM7 18h10v-5c0-2.76-2.24-5-5-5s-5 2.24-5 5z" />
                </Svg>

                <Animated.View style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: pulseIconSize,
                  overflow: 'hidden',
                  transform: [{ translateX: pulseSweep.interpolate({ inputRange: [0, 1], outputRange: [-pulseIconSize, pulseIconSize] }) }],
                }}>
                  <Animated.View style={{
                    transform: [{ translateX: pulseSweep.interpolate({ inputRange: [0, 1], outputRange: [pulseIconSize, -pulseIconSize] }) }],
                  }}>
                    <Svg width={pulseIconSize} height={pulseIconSize} viewBox="0 0 24 24" fill={colors.red}>
                      <Path d="M20 19H4v2h16zM13 6V3h-2v3zm6 5v2h3v-2zM5 13v-2H2v2zm12.66-5.24 1.06-1.06 1.06-1.06-.71-.71-.71-.71-1.06 1.06-1.06 1.06.71.71zm-11.32 0 .71-.71.71-.71L6.7 5.28 5.64 4.22l-.71.71-.71.71L5.28 6.7zM7 18h10v-5c0-2.76-2.24-5-5-5s-5 2.24-5 5z" />
                    </Svg>
                  </Animated.View>
                </Animated.View>
              </View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Svg width={pulseIconSize} height={pulseIconSize} viewBox="0 0 24 24" fill={colors.textMuted}>
                  <Path d="M20 19H4v2h16zM13 6V3h-2v3zm6 5v2h3v-2zM5 13v-2H2v2zm12.66-5.24 1.06-1.06 1.06-1.06-.71-.71-.71-.71-1.06 1.06-1.06 1.06.71.71zm-11.32 0 .71-.71.71-.71L6.7 5.28 5.64 4.22l-.71.71-.71.71L5.28 6.7zM7 18h10v-5c0-2.76-2.24-5-5-5s-5 2.24-5 5z" />
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
              onPress={onUseTapout}
              disabled={!canUseTapout || isLoading}
              activeOpacity={1}
              className="flex-1 py-4 items-center justify-center"
            >
              {isLoading ? (
                <LoadingSpinner size={s(22)} color={colors.textMuted} />
              ) : (
                <>
                  <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: tapoutFlash }} />
                  <Text style={{ color: canUseTapout ? colors.text : colors.textMuted }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    {canUseTapout ? 'Unlock' : 'Not Available'}
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
