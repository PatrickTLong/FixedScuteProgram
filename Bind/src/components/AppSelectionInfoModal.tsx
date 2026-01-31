import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

interface AppSelectionInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function AppSelectionInfoModal({ visible, onClose }: AppSelectionInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    lightTap();
    onClose(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleConfirm}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-4`}>
              App Selection
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
              For your safety, essential apps like Phone, Messages, and Camera cannot be blocked.
            </Text>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => { lightTap(); setDontShowAgain(!dontShowAgain); }}
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-5"
            >
              <View
                style={{
                  backgroundColor: dontShowAgain ? colors.green : 'transparent',
                  borderColor: dontShowAgain ? colors.green : colors.textSecondary,
                }}
                className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
              >
                {dontShowAgain && (
                  <View
                    style={{
                      width: s(8),
                      height: s(13),
                      borderRightWidth: 2.5,
                      borderBottomWidth: 2.5,
                      borderColor: colors.text,
                      transform: [{ rotate: '45deg' }],
                      marginTop: s(-2),
                    }}
                  />
                )}
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                Don't show this again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Button */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(AppSelectionInfoModal);
