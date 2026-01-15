import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface TapoutWarningModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean, confirmed: boolean) => void;
}

function TapoutWarningModal({ visible, onClose }: TapoutWarningModalProps) {
  const { colors } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    onClose(dontShowAgain, true);
    setDontShowAgain(false); // Reset for next time
  };

  const handleCancel = () => {
    onClose(false, false);
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
              Disable Emergency Tapout?
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mb-4">
              Without emergency tapout enabled, you will not be able to unlock your phone early during this blocking session.
            </Text>

            <View className="space-y-3">
              <View className="flex-row">
                <Text style={{ color: colors.red }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  You must wait for the timer to expire or until the scheduled end time
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.red }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  There is no way to end the block early without tapouts
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.red }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  Only disable this if you're confident you won't need emergency access
                </Text>
              </View>
            </View>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
              className="flex-row items-center mt-6"
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
                Keep Enabled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: colors.red }} className="text-base font-nunito-semibold">
                Disable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(TapoutWarningModal);
