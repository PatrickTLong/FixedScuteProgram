import React, { useRef, useEffect } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

function OTPInput({ value, onChange, length = 6, disabled = false, autoFocus = false }: OTPInputProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const inputRef = useRef<TextInput>(null);

  // Auto focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChange = (text: string) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= length) {
      onChange(numericText);
    }
  };

  // Convert value string to array of digits
  const digits = value.split('');

  return (
    <View className="w-full">
      {/* Hidden TextInput that handles actual input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden={true}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        style={{
          position: 'absolute',
          opacity: 0,
          height: s(50),
          width: '100%',
          zIndex: 1,
        }}
      />

      {/* Visual digit boxes */}
      <Pressable onPress={handlePress}>
        <View className="flex-row justify-center" style={{ gap: s(6) }}>
          {Array.from({ length }).map((_, index) => {
            const isFilled = index < digits.length;
            const isCurrentPosition = index === digits.length;

            return (
              <View
                key={index}
                style={{
                  backgroundColor: colors.card,
                  borderColor: isCurrentPosition ? colors.text : colors.border,
                  borderWidth: isCurrentPosition ? 2 : 1,
                  width: s(38),
                  height: s(44),
                  borderRadius: s(8),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <TextInput
                  value={digits[index] || ''}
                  editable={false}
                  style={{
                    color: colors.text,
                    fontSize: s(18),
                    fontFamily: 'Nunito-Bold',
                    textAlign: 'center',
                    width: '100%',
                    height: '100%',
                    padding: 0,
                  }}
                  pointerEvents="none"
                />
              </View>
            );
          })}
        </View>
      </Pressable>
    </View>
  );
}

export default OTPInput;
