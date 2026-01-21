import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BlockSettingsWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function BlockSettingsWarningModal({ visible, onConfirm, onCancel }: BlockSettingsWarningModalProps) {
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
              Block Settings App
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito text-center mb-4">
              The entire Settings app will be blocked when this preset is active.
            </Text>

            <View className="space-y-3">
              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  WiFi settings will remain accessible via quick settings panel
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  Basic toggles (Bluetooth, Airplane mode, etc.) stay available in quick settings
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  You won't be able to access app permissions, accounts, or other system settings
                </Text>
              </View>
            </View>

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
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito-semibold">
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
