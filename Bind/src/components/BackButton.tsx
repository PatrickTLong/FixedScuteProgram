import React, { memo } from 'react';
import { ArrowBendUpLeftIcon } from 'phosphor-react-native';
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
      <ArrowBendUpLeftIcon size={s(iconSize.headerNav)} color={colors.text} weight="regular" />
    </HeaderIconButton>
  );
}

export default memo(BackButton);
