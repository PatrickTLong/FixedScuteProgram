import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RecurrenceInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function RecurrenceInfoModal({ visible, onClose }: RecurrenceInfoModalProps) {
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
              Recurring Blocks
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mb-4">
              Set your scheduled block to repeat automatically at regular intervals.
            </Text>

            <View className="space-y-3">
              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  The block duration stays the same for each recurrence
                </Text>
              </View>

              <View className="flex-row">
                <Text style={{ color: colors.textSecondary }} className="mr-2">•</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito flex-1">
                  Choose how often to repeat: minutes, hours, days, weeks, or months
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

export default memo(RecurrenceInfoModal);
