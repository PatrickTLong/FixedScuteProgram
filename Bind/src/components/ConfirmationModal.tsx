import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';

import { useTheme , textSize, fontFamily, radius, shadow, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: React.ReactNode;
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
  icon,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                ...shadow.modal,
              }}
              className={`w-full ${radius['2xl']} overflow-hidden`}
            >
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-3`}>
                  {title}
                </Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-6`}>
                  {message}
                </Text>
              </View>

              {/* Buttons */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
                {/* Cancel Button */}
                <TouchableOpacity
                  onPressIn={() => { if (haptics.modalButton.enabled) triggerHaptic(haptics.modalButton.type); }}
                  onPress={onCancel}
                  activeOpacity={0.8}
                  style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
                  className="flex-1 py-4 items-center justify-center"
                >
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                {/* Confirm Button */}
                <TouchableOpacity
                  onPressIn={() => { if (haptics.modalButton.enabled) triggerHaptic(haptics.modalButton.type); }}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                  className="flex-1 py-4 items-center justify-center"
                >
                  {icon ? icon : (
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(ConfirmationModal);
