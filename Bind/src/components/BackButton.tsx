import React, { memo, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTap } from '../utils/haptics';
import { useTheme, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface BackButtonProps {
  onPress: () => void;
}

function BackButton({ onPress }: BackButtonProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const handlePress = useCallback(() => {
    lightTap();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: s(10), bottom: s(10), left: s(10), right: s(10) }}
      style={{ padding: s(buttonPadding.standard) }}
    >
      {/* Chevron left - matches PresetEditModal header nav */}
      <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 18l-6-6 6-6"
          stroke={colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

export default memo(BackButton);