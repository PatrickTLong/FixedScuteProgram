import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import AnimatedCheckbox from './AnimatedCheckbox';

interface StrictModeWarningModalProps {
  visible: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function StrictModeWarningModal({ visible, onConfirm, onCancel }: StrictModeWarningModalProps) {
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
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 }} className={`w-full ${radius['2xl']} overflow-hidden`}>
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-4`}>
              Enable Strict Mode?
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center`}>
              Strict Mode prevents easy unlocking. For timed presets, the lock stays active until the timer ends. For all presets, blocked apps won't show the "Continue anyway" button.
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
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                Don't show this again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={{ borderTopColor: colors.divider }} className="border-t flex-row">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{ borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center border-r"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Keep Off
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className={`${textSize.small} ${fontFamily.semibold}`}>
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
