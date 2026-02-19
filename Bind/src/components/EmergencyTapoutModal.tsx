import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import LoadingSpinner from './LoadingSpinner';
import BoxiconsFilled from './BoxiconsFilled';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';

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

  // Pulse sweep animation
  const pulseSweep = useRef(new Animated.Value(0)).current;
  const canUseTapout = presetAllowsTapout && tapoutsRemaining > 0;
  const pulseIconSize = 44;

  useEffect(() => {
    if (!canUseTapout || !visible) {
      pulseSweep.setValue(0);
      return;
    }
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSweep, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(200),
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
                <BoxiconsFilled name="bx-pulse" size={pulseIconSize} color={colors.textMuted} />

                {/* Wipe reveal — slides in from left, trace stays visible and fades */}
                <Animated.View style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: pulseIconSize,
                  overflow: 'hidden',
                  opacity: pulseSweep.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.5, 0.15] }),
                  transform: [{ translateX: pulseSweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-pulseIconSize, 0],
                  }) }],
                }}>
                  <Animated.View style={{
                    transform: [{ translateX: pulseSweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [pulseIconSize, 0],
                    }) }],
                  }}>
                    <BoxiconsFilled name="bx-pulse" size={pulseIconSize} color="white" />
                  </Animated.View>
                </Animated.View>

                {/* Bright sweep head — narrow band at the leading edge */}
                <Animated.View style={{
                  position: 'absolute', top: 0, bottom: 0,
                  width: pulseIconSize * 0.25,
                  overflow: 'hidden',
                  transform: [{ translateX: pulseSweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-(pulseIconSize * 0.25), pulseIconSize],
                  }) }],
                }}>
                  <Animated.View style={{
                    transform: [{ translateX: pulseSweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [pulseIconSize * 0.25, -pulseIconSize],
                    }) }],
                  }}>
                    <BoxiconsFilled name="bx-pulse" size={pulseIconSize} color="white" />
                  </Animated.View>
                </Animated.View>
              </View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <BoxiconsFilled name="bx-pulse" size={pulseIconSize} color={colors.textMuted} />
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
              onPress={onClose}
              activeOpacity={0.7}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Dismiss
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onUseTapout}
              disabled={!canUseTapout || isLoading}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center justify-center"
            >
              {isLoading ? (
                <LoadingSpinner size={s(22)} color={colors.textMuted} />
              ) : (
                <Text style={{ color: canUseTapout ? colors.text : colors.textMuted }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {canUseTapout ? 'Use Tapout' : 'Not Available'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(EmergencyTapoutModal);
