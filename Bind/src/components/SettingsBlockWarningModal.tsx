import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface SettingsBlockWarningModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean, confirmed: boolean) => void;
}

function SettingsBlockWarningModal({ visible, onClose }: SettingsBlockWarningModalProps) {
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
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
              Block Settings App?
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
              The Settings app will be blocked during your session. WiFi, Bluetooth, and other basic toggles remain accessible via the quick settings dropdown.
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
            <Pressable
              onPress={handleCancel}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
              className="flex-1 py-4 items-center justify-center"
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Enable
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(SettingsBlockWarningModal);
