import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface PresetsIconProps {
  size?: number;
  color?: string;
}

export default function PresetsIcon({ size = 24, color = '#FFFFFF' }: PresetsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 3h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 3h4v4h-4zm7 0h4v4h-4zM3 17h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 17h4v4h-4zm7 0h4v4h-4zM3 10h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 10h4v4h-4zm7 0h4v4h-4z" />
    </Svg>
  );
}
