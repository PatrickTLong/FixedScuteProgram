import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ActiveRecurringPresetModalProps {
  visible: boolean;
  onClose: () => void;
}

function ActiveRecurringPresetModal({ visible, onClose }: ActiveRecurringPresetModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Cannot Edit Preset
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito text-center mb-2">
              Recurring presets cannot be edited while active.
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-base font-nunito text-center">
              Please toggle off the preset or wait for it to expire before making changes.
            </Text>
          </View>

          {/* Button */}
          <View style={{ borderTopColor: colors.border }} className="border-t">
            <TouchableOpacity
              onPress={onClose}
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

export default memo(ActiveRecurringPresetModal);
