import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';

interface AppSelectionInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function AppSelectionInfoModal({ visible, onClose }: AppSelectionInfoModalProps) {
  const { colors } = useTheme();

  const handleConfirm = () => {
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleConfirm}
    >
      <Pressable className="flex-1" onPress={handleConfirm}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  App Selection
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  For your safety, essential apps like Phone, Messages, and Camera cannot be blocked.
                </Text>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                  className="py-4 items-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(AppSelectionInfoModal);
