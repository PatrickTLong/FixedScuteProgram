import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Animated, Easing, TouchableOpacity, StyleSheet, AppState } from 'react-native';
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
  const iconScale = useRef(new Animated.Value(1)).current;

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
        iconScale.stopAnimation(() => {
          iconScale.setValue(1);
        });
      }
    });
    return () => sub.remove();
  }, [flashOpacity, iconScale]);

  const triggerFlash = useCallback(() => {
    if (disabled) return;
    if (haptics.headerButton.enabled) {
      triggerHaptic(haptics.headerButton.type);
    }
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(0.3);

    // Scale pop
    iconScale.setValue(1);
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1.2,
        duration: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 100,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

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
  }, [disabled, flashOpacity, iconScale, onPressInProp]);

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
      <Animated.View style={[styles.container, { transform: [{ scale: iconScale }] }]}>
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
