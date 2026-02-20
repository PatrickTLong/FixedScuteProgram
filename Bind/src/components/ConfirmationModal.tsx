import React, { memo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';

import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const cancelFlash = useRef(new Animated.Value(0)).current;
  const confirmFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cancelFlash.stopAnimation(() => cancelFlash.setValue(0));
    confirmFlash.stopAnimation(() => confirmFlash.setValue(0));
  }, [visible]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View>
            <View
              style={{
                backgroundColor: colors.card,
                borderWidth: 1, borderColor: colors.border,
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

              {/* Buttons */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
                {/* Cancel Button */}
                <TouchableOpacity
                  onPressIn={() => triggerFlash(cancelFlash)}
                  onPress={onCancel}
                  activeOpacity={1}
                  style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
                  className="flex-1 py-4 items-center justify-center"
                >
                  <View>
                    <Animated.View style={{ position: 'absolute', top: s(-7), left: s(-18), right: s(-18), bottom: s(-7), backgroundColor: '#ffffff', opacity: cancelFlash, borderRadius: 50 }} />
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                      {cancelText}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Confirm Button */}
                <TouchableOpacity
                  onPressIn={() => triggerFlash(confirmFlash)}
                  onPress={onConfirm}
                  activeOpacity={1}
                  className="flex-1 py-4 items-center justify-center"
                >
                  <View>
                    <Animated.View style={{ position: 'absolute', top: s(-7), left: s(-18), right: s(-18), bottom: s(-7), backgroundColor: '#ffffff', opacity: confirmFlash, borderRadius: 50 }} />
                    {icon ? icon : (
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        {confirmText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </View>
    </Modal>
  );
}

export default memo(ConfirmationModal);
