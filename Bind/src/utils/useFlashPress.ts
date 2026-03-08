import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

const FLASH_FADE_DURATION = 300;
const FLASH_OPACITY = 0.08;

export function useFlashPress(disabled = false) {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(FLASH_OPACITY);
  }, [disabled, flashOpacity]);

  const onPressOut = useCallback(() => {
    flashAnimRef.current = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: FLASH_FADE_DURATION,
      useNativeDriver: true,
    });
    flashAnimRef.current.start();
  }, [flashOpacity]);

  return { flashOpacity, onPressIn, onPressOut };
}
