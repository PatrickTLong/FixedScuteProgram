import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet, AppState } from 'react-native';
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

  // Reset flash if app returns to foreground (animation freezes when navigating away)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (flashAnimRef.current) flashAnimRef.current.stop();
        // stopAnimation syncs the native driver before resetting,
        // preventing a resumed native animation from overriding setValue
        flashOpacity.stopAnimation(() => {
          flashOpacity.setValue(0);
        });
      }
    });
    return () => sub.remove();
  }, [flashOpacity]);

  const triggerFlash = useCallback(() => {
    if (disabled) return;
    if (haptics.headerButton.enabled) {
      triggerHaptic(haptics.headerButton.type);
    }
    if (flashAnimRef.current) flashAnimRef.current.stop();
    // Show flash while finger is held down
    flashOpacity.setValue(0.3);
    onPressInProp?.();
  }, [disabled, flashOpacity, onPressInProp]);

  const handlePressOut = useCallback(() => {
    // Release: animate flash back
    flashAnimRef.current = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: FLASH_DURATION,
      useNativeDriver: true,
    });
    flashAnimRef.current.start();
    onPressOut?.();
  }, [flashOpacity, onPressOut]);

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
      <Animated.View style={styles.container}>
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
      </Animated.View>
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
