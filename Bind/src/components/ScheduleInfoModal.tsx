import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface ScheduleInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function ScheduleInfoModal({ visible, onClose }: ScheduleInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  const handleClose = () => {
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View>
            <View style={{ backgroundColor: colors.card, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  Scheduled Blocking
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center`}>
                  Schedule presets to automatically activate and deactivate at set times. Multiple scheduled presets can run alongside your active preset.
                </Text>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.8}
                  className="py-4 items-center justify-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(ScheduleInfoModal);
