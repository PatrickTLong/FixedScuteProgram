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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
                {canUseTapout ? (
                  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 640 640">
                    <Path d="M320 171.9L305 151.1C280 116.5 239.9 96 197.1 96C123.6 96 64 155.6 64 229.1L64 231.7C64 255.3 70.2 279.7 80.6 304L186.6 304C189.8 304 192.7 302.1 194 299.1L225.8 222.8C229.5 214 238.1 208.2 247.6 208C257.1 207.8 265.9 213.4 269.8 222.1L321.1 336L362.5 253.2C366.6 245.1 374.9 239.9 384 239.9C393.1 239.9 401.4 245 405.5 253.2L428.7 299.5C430.1 302.2 432.8 303.9 435.9 303.9L559.5 303.9C570 279.6 576.1 255.2 576.1 231.6L576.1 229C576 155.6 516.4 96 442.9 96C400.2 96 360 116.5 335 151.1L320 171.8zM533.6 352L435.8 352C414.6 352 395.2 340 385.7 321L384 317.6L341.5 402.7C337.4 411 328.8 416.2 319.5 416C310.2 415.8 301.9 410.3 298.1 401.9L248.8 292.4L238.3 317.6C229.6 338.5 209.2 352.1 186.6 352.1L106.4 352.1C153.6 425.9 229.4 493.8 276.8 530C289.2 539.4 304.4 544.1 319.9 544.1C335.4 544.1 350.7 539.5 363 530C410.6 493.7 486.4 425.8 533.6 352z" fill="#FF5C5C" />
                  </Svg>
                ) : (
                  <MaterialCommunityIcons name="heart-broken" size={iconSize.md} color={colors.textMuted} />
                )}
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
