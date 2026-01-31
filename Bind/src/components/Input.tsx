import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { useTheme , textSize, fontFamily, radius } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View className="mb-4">
      {label && (
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} mb-2`}>
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
        className={`border ${radius.full} px-5 py-4 ${textSize.base} ${fontFamily.regular}`}
        {...textInputProps}
      />
      {error && (
        <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular} mt-2`}>
          {error}
        </Text>
      )}
    </View>
  );
}
