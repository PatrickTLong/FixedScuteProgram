import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface TapoutWarningModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean, confirmed: boolean) => void;
}

function TapoutWarningModal({ visible, onClose }: TapoutWarningModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
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
      <Pressable className="flex-1" onPress={handleCancel}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-4`}>
                  Disable Emergency Tapout?
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                  Without tapouts, you cannot unlock early. You must wait for the timer to expire or the scheduled end time.
                </Text>

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

              {/* Buttons */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
                <TouchableOpacity
                  onPress={handleCancel}
                  activeOpacity={0.7}
                  style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
                  className="flex-1 py-4 items-center"
                >
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Keep Enabled
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                  className="flex-1 py-4 items-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Disable
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(TapoutWarningModal);
