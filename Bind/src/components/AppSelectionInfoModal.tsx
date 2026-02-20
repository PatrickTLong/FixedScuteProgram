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

interface AppSelectionInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

function AppSelectionInfoModal({ visible, onClose }: AppSelectionInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    flash.stopAnimation(() => flash.setValue(0));
  }, [visible]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleConfirm = () => {
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleConfirm}
    >
      <Pressable className="flex-1" onPress={handleConfirm}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  App Selection
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  For your safety, essential apps like Phone, Messages, and Camera cannot be blocked.
                </Text>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <TouchableOpacity
                  onPressIn={() => triggerFlash(flash)}
                  onPress={handleConfirm}
                  activeOpacity={1}
                  className="py-4 items-center justify-center"
                >
                  <View>
                    <Animated.View style={{ position: 'absolute', top: s(-7), left: s(-18), right: s(-18), bottom: s(-7), backgroundColor: '#ffffff', opacity: flash, borderRadius: 50 }} />
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      Dismiss
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

export default memo(AppSelectionInfoModal);
