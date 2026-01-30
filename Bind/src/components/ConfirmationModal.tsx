import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { lightTap, heavyTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, radius } from '../context/ThemeContext';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
        <View
          renderToHardwareTextureAndroid={true}
          style={{
            backgroundColor: colors.card,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 10,
          }}
          className={`w-full ${radius['2xl']} overflow-hidden`}
        >
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-3`}>
              {title}
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center leading-6`}>
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ borderTopColor: colors.border, borderRightColor: colors.border }} className="flex-row border-t">
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => { lightTap(); onCancel(); }}
              activeOpacity={0.7}
              style={{ borderRightColor: colors.border }}
              className="flex-1 py-4 items-center border-r"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => { isDestructive ? heavyTap() : lightTap(); onConfirm(); }}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ConfirmationModal);
