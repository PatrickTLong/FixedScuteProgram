import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface StrictModeWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function StrictModeWarningModal({ visible, onConfirm, onCancel }: StrictModeWarningModalProps) {
  const { colors } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    onConfirm(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  const handleCancel = () => {
    onCancel();
    setDontShowAgain(false); // Reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Enable Strict Mode?
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito text-center mb-4">
              With Strict Mode enabled, this preset will be locked until the timer ends or you use an emergency tapout (if available).
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center">
              Without Strict Mode, you can unlock anytime using slide-to-unlock.
            </Text>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-6"
            >
              <View
                style={{
                  backgroundColor: dontShowAgain ? colors.green : 'transparent',
                  borderColor: dontShowAgain ? colors.green : colors.textSecondary,
                }}
                className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
              >
                {dontShowAgain && (
                  <View className="w-2 h-3 border-r-2 border-b-2 border-black rotate-45 -mt-0.5" />
                )}
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                Don't show this again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={{ borderTopColor: colors.border }} className="border-t flex-row">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{ borderRightColor: colors.border }}
              className="flex-1 py-4 items-center border-r"
            >
              <Text style={{ color: colors.textSecondary }} className="text-base font-nunito-semibold">
                Keep Off
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: colors.green }} className="text-base font-nunito-semibold">
                Enable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(StrictModeWarningModal);
