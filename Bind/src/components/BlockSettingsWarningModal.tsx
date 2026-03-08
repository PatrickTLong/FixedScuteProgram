import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface BlockSettingsWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function BlockSettingsWarningModal({ visible, onConfirm, onCancel }: BlockSettingsWarningModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  const handleConfirm = () => {
    onConfirm(true);
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
              Block Settings App
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center`}>
              The Settings app will be blocked when this preset is active. Basic toggles like WiFi and Bluetooth remain accessible via quick settings.
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
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.8}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Enable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(BlockSettingsWarningModal);
