import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { lightTap, heavyTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

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
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-3">
              {title}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center leading-6">
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
              <Text style={{ color: colors.textSecondary }} className="text-base font-nunito">
                {cancelText}
              </Text>
            </TouchableOpacity>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => { isDestructive ? heavyTap() : lightTap(); onConfirm(); }}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito-semibold">
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
