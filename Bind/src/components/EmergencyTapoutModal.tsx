import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
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
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View
          style={{
            backgroundColor: colors.card,
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
                  <Path d="M4.11 9.8 3 9.05a1.26 1.26 0 0 1 -0.58 -0.82L1.8 4c0.7 0.64 1.56 1.42 2.51 2.26a8.62 8.62 0 0 1 0.59 -1.45c-1.69 -1.51 -3 -2.73 -3.61 -3.34a0.76 0.76 0 0 0 -0.87 -0.15 0.75 0.75 0 0 0 -0.42 0.78l0.9 6.37a2.75 2.75 0 0 0 1.25 1.84l2.69 1.76a7.85 7.85 0 0 1 -0.73 -2.27Z" />
                  <Path d="M24 20.29a2 2 0 0 0 -0.9 -1.24l-3.77 -2.3 0.85 -1.09a0.75 0.75 0 1 0 -1.18 -0.93l-0.93 1.19 -0.07 -0.06V16a3 3 0 0 1 -2.66 3l0.24 0.16 -0.7 0.88a0.77 0.77 0 0 0 0.12 1.02 0.74 0.74 0 0 0 0.46 0.16 0.76 0.76 0 0 0 0.6 -0.29l0.78 -1L21 22.47a2 2 0 0 0 1 0.29 2 2 0 0 0 2 -2.47Z" />
                  <Path d="M19.69 6.29c0.95 -0.84 1.81 -1.62 2.52 -2.27l-0.6 4.18a1.25 1.25 0 0 1 -0.6 0.86l-1.12 0.74a7.85 7.85 0 0 1 -0.74 2.27l2.66 -1.74a2.76 2.76 0 0 0 1.28 -1.89L24 2.1a0.75 0.75 0 0 0 -0.41 -0.78 0.76 0.76 0 0 0 -0.87 0.15c-0.59 0.61 -1.93 1.84 -3.62 3.34a7.65 7.65 0 0 1 0.59 1.48Z" />
                  <Path d="M6 16v-0.14l-0.07 0.06L5 14.73a0.75 0.75 0 1 0 -1.18 0.93l0.85 1.09 -3.77 2.3a2 2 0 0 0 -0.67 2.75 2 2 0 0 0 1.24 0.9 2 2 0 0 0 0.47 0.06 2 2 0 0 0 1 -0.29l4.17 -2.54 0.78 1a0.76 0.76 0 0 0 0.6 0.29 0.74 0.74 0 0 0 0.51 -0.16 0.77 0.77 0 0 0 0.12 -1.06l-0.7 -0.88 0.24 -0.12A3 3 0 0 1 6 16Z" />
                  <Path d="M13.5 16a1.5 1.5 0 0 0 3 0v-2.82a6.5 6.5 0 1 0 -9 0V16a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0 3 0Zm1.62 -9a1.5 1.5 0 1 1 -1.5 1.5 1.5 1.5 0 0 1 1.5 -1.5Zm-6 0a1.5 1.5 0 1 1 -1.5 1.5A1.5 1.5 0 0 1 9.12 7Z" />
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
            <Pressable
              onPress={onClose}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Dismiss
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { if (haptics.blockNowButton.enabled) triggerHaptic(haptics.blockNowButton.unlockType); onUseTapout(); }}
              disabled={!canUseTapout || isLoading}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
              className="flex-1 py-4 items-center justify-center"
            >
              {isLoading ? (
                <LoadingSpinner size={s(22)} color={colors.textMuted} />
              ) : (
                <Text style={{ color: canUseTapout ? colors.text : colors.textMuted, opacity: canUseTapout ? 1 : 0.6 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Unlock
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(EmergencyTapoutModal);
