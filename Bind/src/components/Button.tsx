import React, { memo } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { lightTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

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
  const { s } = useResponsive();

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
        return { color: colors.text };
      default:
        return { color: colors.bg };
    }
  };

  return (
    <TouchableOpacity
      onPressIn={lightTap}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[getButtonStyle(), {
        borderWidth: 1, borderColor: colors.border,
        ...shadow.card,
      }]}
      className={`${radius.full} py-4 px-6 items-center justify-center${fullWidth ? ' w-full' : ''}`}
    >
      <Text style={[getTextStyle(), loading && { opacity: 0 }]} className={`${textSize.base} ${fontFamily.semibold}`}>{title}</Text>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          <Lottie
            source={require('../frontassets/Loading Dots Blue.json')}
            autoPlay
            loop
            speed={2}
            style={{ width: s(150), height: s(150) }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(Button);
