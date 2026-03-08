import React, { memo, useCallback } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';
import { useFlashPress } from '../utils/useFlashPress';

interface FlashPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
}

function FlashPressable({
  onPress,
  onLongPress,
  onPressIn: extraPressIn,
  onPressOut: extraPressOut,
  disabled,
  hitSlop,
  delayLongPress,
  style,
  className,
  children,
}: FlashPressableProps) {
  const { flashOpacity, onPressIn, onPressOut } = useFlashPress(disabled);

  const handlePressIn = useCallback(() => {
    onPressIn();
    extraPressIn?.();
  }, [onPressIn, extraPressIn]);

  const handlePressOut = useCallback(() => {
    onPressOut();
    extraPressOut?.();
  }, [onPressOut, extraPressOut]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      delayLongPress={delayLongPress}
      style={[style as ViewStyle, { overflow: 'hidden' }]}
      className={className}
    >
      <Animated.View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: flashOpacity }}
        pointerEvents="none"
      />
      {children}
    </Pressable>
  );
}

export default memo(FlashPressable);
