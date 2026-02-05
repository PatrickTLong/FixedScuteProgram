import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import Svg, { Path } from 'react-native-svg';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { lightTap, mediumTap } from '../utils/haptics';
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

  // Can use tapout if preset allows it AND has remaining tapouts
  const canUseTapout = presetAllowsTapout && tapoutsRemaining > 0;

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
          {/* Header */}
          <View className="p-6 pb-4 items-center">
            <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}>
              Phone is Locked
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center mt-2`}>
              Wait for the timer to finish, or unlock now by using an emergency tapout.
            </Text>
          </View>

          {/* Divider */}
          <View style={{ backgroundColor: colors.border, height: 1 }} />

          {/* Emergency Tapout Section */}
          <View className="justify-center p-6">
            <View className="items-center">
              <View className="flex-row items-center mb-3">
                <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill={canUseTapout ? '#f59e0b' : colors.textMuted}>
                  <Path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  />
                </Svg>
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} ml-2`}>
                  Emergency Tapout
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} mb-3 text-center`}>
                {canUseTapout
                  ? `You have ${tapoutsRemaining} tapout${tapoutsRemaining !== 1 ? 's' : ''} remaining.`
                  : getUnavailableReason()}
              </Text>

              <View
                style={{
                  backgroundColor: colors.card,
                  ...shadow.card,
                  borderRadius: 9999,
                  overflow: 'hidden',
                }}
                className="w-full"
              >
              <TouchableOpacity
                onPressIn={mediumTap}
                onPress={onUseTapout}
                disabled={!canUseTapout || isLoading}
                activeOpacity={0.7}
                style={{
                  backgroundColor: canUseTapout ? '#f59e0b' : colors.cardLight,
                  paddingVertical: s(buttonPadding.standard),
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 9999,
                  opacity: canUseTapout ? 1 : 0.5,
                }}
                className="w-full items-center"
              >
                <Text
                  style={{ color: canUseTapout ? colors.text : colors.textSecondary, opacity: isLoading ? 0 : 1 }}
                  className={`${textSize.small} ${fontFamily.bold}`}
                >
                  {canUseTapout ? 'Use Emergency Tapout' : 'Not Available'}
                </Text>
                {isLoading && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <Lottie
                      source={require('../frontassets/Loading Dots Blue.json')}
                      autoPlay
                      loop
                      speed={2}
                      style={{ width: s(150), height: s(150) }}
                    />
                  </View>
                )}
              </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Close Button */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={onClose}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(EmergencyTapoutModal);
