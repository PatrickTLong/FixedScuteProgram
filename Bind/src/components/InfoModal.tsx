import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { lightTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, radius } from '../context/ThemeContext';

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
  buttonText = 'OK',
  onClose,
}: InfoModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1, borderColor: colors.border, shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 10,
          }}
          className={`w-full ${radius['2xl']} overflow-hidden`}
        >
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} text-center mb-3`}>
              {title}
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center leading-6`}>
              {message}
            </Text>
          </View>

          {/* Button */}
          <View style={{ borderTopColor: colors.divider }} className="border-t">
            <TouchableOpacity
              onPress={() => { lightTap(); onClose(); }}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(InfoModal);
