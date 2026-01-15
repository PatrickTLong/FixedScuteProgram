import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ScheduleInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function ScheduleInfoModal({ visible, onClose }: ScheduleInfoModalProps) {
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
              Scheduled Blocking
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mb-4">
              Schedule a preset to automatically activate at a future date and deactivate at another.
            </Text>

            <View className="space-y-3">
              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  You can have multiple scheduled presets as long as their dates don't overlap
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  Scheduled presets work alongside your current active preset
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  The preset will automatically activate when the start time arrives
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  Tap a scheduled preset to edit its dates
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
              <Text style={{ color: colors.green }} className="text-base font-nunito-semibold">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ScheduleInfoModal);
