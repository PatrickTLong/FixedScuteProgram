import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface DisableTapoutWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function DisableTapoutWarningModal({ visible, onConfirm, onCancel }: DisableTapoutWarningModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  const handleConfirm = () => {
    onConfirm(false);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
              Disable Emergency Tapout?
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center`}>
              You won't be able to unlock this preset early. Only disable if you're certain you won't need emergency access.
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.8}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Keep Enabled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.8}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Disable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(DisableTapoutWarningModal);
