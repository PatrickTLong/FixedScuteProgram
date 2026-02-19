import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LoadingSpinner from './LoadingSpinner';
import BoxiconsFilled from './BoxiconsFilled';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';

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
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center`}>
              Phone is Locked
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mt-2`}>
              Wait for the timer to finish, or unlock now by using an emergency tapout.
            </Text>
          </View>

          {/* Divider */}
          <View style={{ backgroundColor: colors.border, height: 1 }} />

          {/* Emergency Tapout Section */}
          <View className="justify-center p-6">
            <View className="items-center">
              <View className="flex-row items-center mb-3">
                <BoxiconsFilled name={canUseTapout ? "bx-heart" : "bx-heart-break"} size={iconSize.md} color={canUseTapout ? '#FF5C5C' : colors.textMuted} />
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
                  ...shadow.card,
                  borderRadius: 9999,
                  overflow: 'hidden',
                }}
                className="w-full"
              >
              <TouchableOpacity
                onPress={onUseTapout}
                disabled={!canUseTapout || isLoading}
                activeOpacity={0.7}
                style={{
                  backgroundColor: canUseTapout ? colors.green : colors.cardLight,
                  paddingVertical: s(buttonPadding.standard),
                  borderWidth: 1,
                  borderColor: canUseTapout ? colors.green : colors.border,
                  borderRadius: 9999,
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
                    <LoadingSpinner size={s(22)} color={colors.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Close Button */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TouchableOpacity
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
