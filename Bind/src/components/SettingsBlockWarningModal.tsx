import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
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
    lightTap();
    onClose(dontShowAgain, true);
    setDontShowAgain(false); // Reset for next time
  };

  const handleCancel = () => {
    lightTap();
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
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View renderToHardwareTextureAndroid={true} style={{ backgroundColor: colors.card, shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 }} className={`w-full ${radius['2xl']} overflow-hidden`}>
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-4`}>
              Block Settings App?
            </Text>

            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
              The Settings app will be blocked during your session. WiFi, Bluetooth, and other basic toggles remain accessible via the quick settings dropdown.
            </Text>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => { lightTap(); setDontShowAgain(!dontShowAgain); }}
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-6"
            >
              <View
                style={{
                  backgroundColor: dontShowAgain ? '#22c55e' : 'transparent',
                  borderColor: dontShowAgain ? '#22c55e' : colors.textSecondary,
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
                      borderColor: '#FFFFFF',
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
          <View style={{ borderTopColor: colors.border }} className="border-t flex-row">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={{ borderRightColor: colors.border }}
              className="flex-1 py-4 items-center border-r"
            >
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Cancel
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

export default memo(SettingsBlockWarningModal);
