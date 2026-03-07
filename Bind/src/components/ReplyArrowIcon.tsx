import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ReplyArrowIconProps {
  size?: number;
  color?: string;
  direction?: 'left' | 'right';
}

export default function ReplyArrowIcon({ size = 24, color = '#FFFFFF', direction = 'left' }: ReplyArrowIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={direction === 'right' ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path d="m10.16 4.74-7.74 6.88c-.23.2-.23.55 0 .75l7.74 6.88c.32.29.84.06.84-.38v-3.88h3.64c2.13 0 4.14.97 5.47 2.63l1 1.25c.3.37.9.16.9-.31v-1.57c0-4.42-3.58-8-8-8h-3V5.11c0-.43-.51-.66-.84-.38Z" />
    </Svg>
  );
}
