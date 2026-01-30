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

interface DisableTapoutWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function DisableTapoutWarningModal({ visible, onConfirm, onCancel }: DisableTapoutWarningModalProps) {
  const { colors } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    lightTap();
    onConfirm(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  const handleCancel = () => {
    lightTap();
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
        <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Disable Emergency Tapout?
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center">
              You won't be able to unlock this preset early. Only disable if you're certain you won't need emergency access.
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

          {/* Buttons */}
          <View style={{ borderTopColor: colors.border }} className="border-t flex-row">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{ borderRightColor: colors.border }}
              className="flex-1 py-4 items-center border-r"
            >
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito-semibold">
                Keep Enabled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">
                Disable
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(DisableTapoutWarningModal);
