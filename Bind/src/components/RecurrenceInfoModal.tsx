import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface RecurrenceInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function RecurrenceInfoModal({ visible, onClose }: RecurrenceInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  const handleClose = () => {
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View>
            <View style={{ backgroundColor: colors.card, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  Recurring Blocks
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center`}>
                  Set your block to repeat automatically. Choose intervals from minutes to months.
                </Text>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <Pressable
                  onPress={handleClose}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  className="py-4 items-center justify-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Dismiss
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(RecurrenceInfoModal);
