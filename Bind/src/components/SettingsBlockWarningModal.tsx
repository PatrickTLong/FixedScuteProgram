import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
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
  const leftFlash = useRef(new Animated.Value(0)).current;
  const rightFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    leftFlash.stopAnimation(() => leftFlash.setValue(0));
    rightFlash.stopAnimation(() => rightFlash.setValue(0));
  }, [visible]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

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
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
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
            <TouchableOpacity
              onPressIn={() => triggerFlash(leftFlash)}
              onPress={handleCancel}
              activeOpacity={1}
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
              className="flex-1 py-4 items-center justify-center"
            >
              <View>
                <Animated.View style={{ position: 'absolute', top: s(-7), left: s(-18), right: s(-18), bottom: s(-7), backgroundColor: '#ffffff', opacity: leftFlash, borderRadius: 50 }} />
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Cancel
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPressIn={() => triggerFlash(rightFlash)}
              onPress={handleConfirm}
              activeOpacity={1}
              className="flex-1 py-4 items-center justify-center"
            >
              <View>
                <Animated.View style={{ position: 'absolute', top: s(-7), left: s(-18), right: s(-18), bottom: s(-7), backgroundColor: '#ffffff', opacity: rightFlash, borderRadius: 50 }} />
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Enable
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(SettingsBlockWarningModal);
