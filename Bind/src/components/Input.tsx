import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
        <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-2">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
        className="border rounded-full px-5 py-4 text-base font-nunito"
        {...textInputProps}
      />
      {error && (
        <Text style={{ color: '#FF5C5C' }} className="text-sm font-nunito mt-2">
          {error}
        </Text>
      )}
    </View>
  );
}
