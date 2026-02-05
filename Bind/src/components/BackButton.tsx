import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import HeaderIconButton from './HeaderIconButton';
import { useTheme, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface BackButtonProps {
  onPress: () => void;
}

function BackButton({ onPress }: BackButtonProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  return (
    <HeaderIconButton
      onPress={onPress}
      style={{ padding: s(buttonPadding.standard), paddingLeft: s(22) }}
    >
      {/* Arrow left - Feather arrow-left */}
      <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12H5M12 19l-7-7 7-7"
          stroke={colors.text}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </HeaderIconButton>
  );
}

export default memo(BackButton);
