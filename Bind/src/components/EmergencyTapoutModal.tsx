import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { mediumTap } from '../utils/haptics';

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
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Header */}
          <View className="p-6 pb-4 items-center">
            {/* Lock Icon */}
            <View style={{ backgroundColor: `${colors.red}33` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
                  stroke={colors.red}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center">
              Phone is Locked
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center mt-2">
              Tap your Scute card to unlock when the timer is finished, or use an emergency tapout if available.
            </Text>
          </View>

          {/* Emergency Tapout Section */}
          <View className="px-6 pb-4">
            <View style={{ backgroundColor: colors.bg }} className="rounded-xl p-4">
              <View className="flex-row items-center mb-3">
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                    stroke={canUseTapout ? colors.green : colors.textMuted}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold ml-2">
                  Emergency Tapout
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-3">
                {canUseTapout
                  ? `You have ${tapoutsRemaining} tapout${tapoutsRemaining !== 1 ? 's' : ''} remaining.`
                  : getUnavailableReason()}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  mediumTap();
                  onUseTapout();
                }}
                disabled={!canUseTapout || isLoading}
                activeOpacity={0.7}
                style={{ backgroundColor: canUseTapout ? colors.green : `${colors.textMuted}80` }}
                className="py-3 rounded-xl items-center"
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text
                    style={{ color: canUseTapout ? '#000000' : colors.textSecondary }}
                    className="text-base font-nunito-bold"
                  >
                    {canUseTapout ? 'Use Emergency Tapout' : 'Not Available'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Close Button */}
          <View style={{ borderTopColor: colors.border }} className="border-t">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: colors.textSecondary }} className="text-base font-nunito-semibold">
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
