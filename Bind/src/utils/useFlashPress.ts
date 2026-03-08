import { useCallback, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

const FLASH_FADE_DURATION = 300;
const FLASH_OPACITY = 0.08;

export function useFlashPress(disabled = false) {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const isFocused = useIsFocused();

  const wasFocused = useRef(true);
  useEffect(() => {
    if (!isFocused) {
      if (flashAnimRef.current) flashAnimRef.current.stop();
      flashOpacity.stopAnimation(() => flashOpacity.setValue(0));
    } else if (!wasFocused.current) {
      // Safety reset on refocus in case native driver didn't sync
      flashOpacity.setValue(0);
    }
    wasFocused.current = isFocused;
  }, [isFocused, flashOpacity]);

  const onPressIn = useCallback(() => {
    if (disabled) return;
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(FLASH_OPACITY);
  }, [disabled, flashOpacity]);

  const onPressOut = useCallback(() => {
    flashAnimRef.current = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: FLASH_FADE_DURATION,
      useNativeDriver: false,
    });
    flashAnimRef.current.start();
  }, [flashOpacity]);

  return { flashOpacity, onPressIn, onPressOut };
}
