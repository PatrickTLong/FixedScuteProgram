import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { lightTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    if (disabled) {
      return { backgroundColor: colors.border };
    }

    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.text };
      case 'secondary':
        return { backgroundColor: colors.green };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.green };
      default:
        return { backgroundColor: colors.text };
    }
  };

  const getTextStyle = () => {
    if (disabled) {
      return { color: colors.textSecondary };
    }

    switch (variant) {
      case 'primary':
        return { color: colors.bg };
      case 'secondary':
        return { color: '#000000' };
      case 'outline':
        return { color: '#FFFFFF' };
      default:
        return { color: colors.bg };
    }
  };

  const handlePress = useCallback(() => {
    lightTap();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={getButtonStyle()}
      className={`rounded-full py-4 px-6 items-center justify-center${fullWidth ? ' w-full' : ''}`}
    >
      {loading ? (
        <Lottie
          source={require('../frontassets/Loading Animation 3 Dots.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: 40, height: 40 }}
        />
      ) : (
        <Text style={getTextStyle()} className="text-base font-nunito-semibold">{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export default memo(Button);
