import React, { memo, useCallback, useRef } from 'react';
import { Animated, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useResponsive } from '../utils/responsive';
import { haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

const DEFAULT_FLASH_SIZE = 40;
const FLASH_DURATION = 300;

export interface HeaderIconButtonProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: any;
  className?: string;
  flashSize?: number;
}

function HeaderIconButton({ onPress, onPressIn: onPressInProp, onPressOut, disabled = false, children, style, className, flashSize = DEFAULT_FLASH_SIZE }: HeaderIconButtonProps) {
  const { s } = useResponsive();
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const triggerFlash = useCallback(() => {
    if (disabled) return;
    if (haptics.headerButton.enabled) {
      triggerHaptic(haptics.headerButton.type);
    }
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(0.3);
    if (onPressInProp) {
      // Hold mode: keep flash visible, fade on release
    } else {
      flashAnimRef.current = Animated.timing(flashOpacity, {
        toValue: 0,
        duration: FLASH_DURATION,
        useNativeDriver: true,
      });
      flashAnimRef.current.start();
    }
    onPressInProp?.();
  }, [disabled, flashOpacity, onPressInProp]);

  const handlePressOut = useCallback(() => {
    if (onPressInProp) {
      // Fade out flash on release for hold buttons
      flashAnimRef.current = Animated.timing(flashOpacity, {
        toValue: 0,
        duration: FLASH_DURATION,
        useNativeDriver: true,
      });
      flashAnimRef.current.start();
    }
    onPressOut?.();
  }, [flashOpacity, onPressInProp, onPressOut]);

  const scaledSize = s(flashSize);

  return (
    <TouchableOpacity
      onPressIn={triggerFlash}
      onPressOut={handlePressOut}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={style}
      className={className || 'px-2'}
    >
      <View style={styles.container}>
        <Animated.View
          style={{
            position: 'absolute',
            width: scaledSize,
            height: scaledSize,
            borderRadius: scaledSize / 2,
            backgroundColor: '#ffffff',
            opacity: flashOpacity,
          }}
        />
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(HeaderIconButton);
