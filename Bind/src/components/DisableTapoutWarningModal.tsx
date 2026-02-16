import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';

interface DisableTapoutWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function DisableTapoutWarningModal({ visible, onConfirm, onCancel }: DisableTapoutWarningModalProps) {
  const { colors } = useTheme();

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
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-4`}>
                  Disable Emergency Tapout?
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center`}>
                  You won't be able to unlock this preset early. Only disable if you're certain you won't need emergency access.
                </Text>
              </View>

              {/* Buttons */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
                <TouchableOpacity
                  onPress={handleCancel}
                  activeOpacity={0.7}
                  style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
                  className="flex-1 py-4 items-center"
                >
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Keep Enabled
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                  className="flex-1 py-4 items-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Disable
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(DisableTapoutWarningModal);
