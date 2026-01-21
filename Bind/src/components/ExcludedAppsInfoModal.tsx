import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ExcludedAppsInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function ExcludedAppsInfoModal({ visible, onClose }: ExcludedAppsInfoModalProps) {
  const { colors } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Some Apps Are Hidden
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mb-4">
              For your safety, certain essential apps cannot be blocked:
            </Text>

            <View className="space-y-4">
              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2 mt-0.5">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1 leading-5">
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Phone</Text> - Always available so you can make and receive important calls, even during a blocking session
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2 mt-0.5">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1 leading-5">
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Camera</Text> - Kept accessible for capturing important moments, documenting incidents, or emergency situations
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2 mt-0.5">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1 leading-5">
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Messaging</Text> - Ensures you can always send and receive text messages for essential communication
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2 mt-0.5">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1 leading-5">
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Emergency</Text> - Critical apps like emergency dialer remain unblocked to ensure your safety at all times
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2 mt-0.5">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1 leading-5">
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Settings</Text> - Not shown here because it has a dedicated toggle in your preset options
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

          {/* Button */}
          <View style={{ borderTopColor: colors.border }} className="border-t">
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito-semibold">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ExcludedAppsInfoModal);
