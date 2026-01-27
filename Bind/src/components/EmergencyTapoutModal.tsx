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
import { useTheme } from '../context/ThemeContext';
import { lightTap, mediumTap } from '../utils/haptics';

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
            <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center">
              Phone is Locked
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center mt-2">
              Wait for the timer to finish, or unlock now by using an emergency tapout.
            </Text>
          </View>

          {/* Divider */}
          <View style={{ backgroundColor: colors.border, height: 1 }} />

          {/* Emergency Tapout Section */}
          <View className="justify-center p-6">
            <View className="items-center">
              <View className="flex-row items-center mb-3">
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                    stroke={canUseTapout ? '#f59e0b' : colors.textMuted}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold ml-2">
                  Emergency Tapout
                </Text>
              </View>

              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-3 text-center">
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
                style={{
                  backgroundColor: canUseTapout ? '#f59e0b' : `${colors.textMuted}50`,
                  paddingVertical: 14,
                  width: '100%'
                }}
                className="rounded-2xl items-center"
              >
                {isLoading ? (
                  <Lottie
                    source={require('../frontassets/Loading Animation 3 Dots.json')}
                    autoPlay
                    loop
                    speed={2}
                    style={{ width: 40, height: 40 }}
                  />
                ) : (
                  <Text
                    style={{ color: canUseTapout ? '#FFFFFF' : colors.textSecondary }}
                    className="text-sm font-nunito-bold"
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
              onPress={() => {
                lightTap();
                onClose();
              }}
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
