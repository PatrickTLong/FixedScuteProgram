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
                  <Path d="M600-400v-80h320v80H600ZM440-120 313-234q-72-65-123.5-116t-85-96q-33.5-45-49-87T40-621q0-94 63-156.5T260-840q52 0 99 21.5t81 61.5q34-40 81-61.5t99-21.5q85 0 142.5 51.5T834-668q-18-7-36-10.5t-35-3.5q-101 0-172 70.5T520-440q0 52 21 98.5t59 79.5q-19 17-49.5 43.5T498-172l-58 52Z" />
                </Svg>
              </Animated.View>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Svg width={iconSize} height={iconSize} viewBox="0 -960 960 960" fill={colors.textMuted}>
                  <Path d="M481-83Q347-218 267.5-301t-121-138q-41.5-55-54-94T80-620q0-92 64-156t156-64q45 0 87 16.5t75 47.5l-62 216h120l-34 335 114-375H480l71-212q25-14 52.5-21t56.5-7q92 0 156 64t64 156q0 48-13 88t-55 95.5q-42 55.5-121 138T481-83Z" />
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
