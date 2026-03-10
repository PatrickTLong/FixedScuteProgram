import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Keyboard,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface InfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

function InfoModal({
  visible,
  title,
  message,
  buttonText = 'Dismiss',
  onClose,
}: InfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center" style={{ paddingHorizontal: s(32) }}>
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                ...shadow.modal,
              }}
              className={`w-full ${radius['2xl']} overflow-hidden`}
            >
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-3`}>
                  {title}
                </Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-6`}>
                  {message}
                </Text>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <Pressable
                  onPress={onClose}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  className="py-4 items-center justify-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    {buttonText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(InfoModal);
