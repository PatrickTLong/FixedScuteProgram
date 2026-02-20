import React, { memo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
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
    onClose(true, true);
  };

  const handleCancel = () => {
    onClose(true, false);
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
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  Disable Emergency Tapout?
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  Without tapouts, you cannot unlock early. You must wait for the timer to expire or the scheduled end time.
                </Text>
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
                      Keep Enabled
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
                      Disable
                    </Text>
                  </View>
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
