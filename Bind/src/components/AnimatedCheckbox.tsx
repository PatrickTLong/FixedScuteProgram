import React, { useEffect, useRef, memo } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { iconSize } from '../context/ThemeContext';

interface AnimatedCheckboxProps {
  checked: boolean;
  size?: number;
  checkedColor?: string;
  disabled?: boolean;
  skipAnimation?: boolean;
}

function AnimatedCheckbox({
  checked,
  size = iconSize.lg,
  checkedColor = '#22c55e',
  disabled = false,
  skipAnimation = false,
}: AnimatedCheckboxProps) {
  const borderBump = '#434346';
  const animatedValue = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const prevChecked = useRef(checked);

  useEffect(() => {
    if (skipAnimation) {
      animatedValue.setValue(checked ? 1 : 0);
      prevChecked.current = checked;
    } else {
      // Only pop scale on manual select (not deselect, not bulk)
      if (!prevChecked.current && checked) {
        scaleValue.setValue(1);
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
      prevChecked.current = checked;

      Animated.timing(animatedValue, {
        toValue: checked ? 1 : 0,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [checked, animatedValue, skipAnimation, scaleValue]);

  // Opacity for checked background (1 when checked, 0 when unchecked)
  const checkedOpacity = animatedValue;

  // Opacity for unchecked border (0 when checked, 1 when unchecked)
  const uncheckedOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Scale for checkmark
  const checkmarkScale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  return (
    <Animated.View style={{ width: size, height: size, opacity: disabled ? 0.5 : 1, transform: [{ scale: scaleValue }] }}>
      {/* Checked background (green, fades in) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: checkedColor,
          opacity: checkedOpacity,
        }}
      />

      {/* Unchecked border (fades out when checked) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: borderBump,
          opacity: uncheckedOpacity,
        }}
      />

      {/* Checkmark */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: checkedOpacity,
          transform: [{ scale: checkmarkScale }],
        }}
      >
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <Path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export default memo(AnimatedCheckbox);
