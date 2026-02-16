import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';

interface EmailConfirmationModalProps {
  visible: boolean;
  userEmail: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function EmailConfirmationModal({ visible, userEmail, onConfirm, onCancel }: EmailConfirmationModalProps) {
  const { colors } = useTheme();
  const [inputEmail, setInputEmail] = useState('');

  const handleConfirm = useCallback(() => {
    if (inputEmail.trim().toLowerCase() === userEmail.toLowerCase()) {
      setInputEmail('');
      onConfirm();
    }
  }, [inputEmail, userEmail, onConfirm]);

  const handleCancel = useCallback(() => {
    setInputEmail('');
    onCancel();
  }, [onCancel]);

  const isEmailMatch = inputEmail.trim().toLowerCase() === userEmail.toLowerCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
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
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-2`}>
              Confirm Account Deletion
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-6`}>
              To permanently delete your account, please re-type your email address below:
            </Text>

            {/* Email Display */}
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-2`}>
              Your email:
            </Text>
            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} mb-4`}>
              {userEmail}
            </Text>

            {/* Email Input */}
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-2`}>
              Re-type your email:
            </Text>
            <TextInput
              value={inputEmail}
              onChangeText={setInputEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,

              }}
              className={`${radius.xl} px-4 ${textSize.small} py-3 ${fontFamily.regular} mb-2`}
            />
          </View>

          {/* Buttons - Side by Side */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }} className="flex-row">
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
              style={{ borderRightWidth: 1, borderRightColor: colors.divider }}
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Delete Account Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isEmailMatch}
              activeOpacity={0.7}
              className="flex-1 py-4 items-center"
              style={{ opacity: isEmailMatch ? 1 : 0.5 }}
            >
              <Text
                style={{ color: colors.text }}
                className={`${textSize.small} ${fontFamily.semibold}`}
              >
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(EmailConfirmationModal);
