import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import AnimatedCheckbox from './AnimatedCheckbox';

interface RecurrenceInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function RecurrenceInfoModal({ visible, onClose }: RecurrenceInfoModalProps) {
  const { colors } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    lightTap();
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
        <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Recurring Blocks
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center">
              Set your block to repeat automatically. Choose intervals from minutes to months.
            </Text>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => { lightTap(); setDontShowAgain(!dontShowAgain); }}
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-6"
            >
              <View className="mr-3">
                <AnimatedCheckbox checked={dontShowAgain} size={20} />
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
              <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">
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
