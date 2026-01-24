import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AnimatedCheckboxProps {
  checked: boolean;
  size?: number;
  checkedColor?: string;
  disabled?: boolean;
  skipAnimation?: boolean;
}

function AnimatedCheckbox({
  checked,
  size = 24,
  checkedColor = '#22c55e',
  disabled = false,
  skipAnimation = false,
}: AnimatedCheckboxProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (skipAnimation) {
      animatedValue.setValue(checked ? 1 : 0);
    } else {
      Animated.timing(animatedValue, {
        toValue: checked ? 1 : 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true, // Now we can use native driver!
      }).start();
    }
  }, [checked, animatedValue, skipAnimation]);

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

  const checkmarkWidth = size * 0.4;
  const checkmarkHeight = size * 0.65;

  return (
    <View style={{ width: size, height: size, opacity: disabled ? 0.5 : 1 }}>
      {/* Checked background (green, fades in) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size * 0.17,
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
          borderRadius: size * 0.17,
          borderWidth: 2,
          borderColor: colors.border,
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
        <View
          style={{
            width: checkmarkWidth,
            height: checkmarkHeight,
            borderRightWidth: 2.5,
            borderBottomWidth: 2.5,
            borderColor: '#FFFFFF',
            transform: [{ rotate: '45deg' }],
            marginTop: -size * 0.1,
          }}
        />
      </Animated.View>
    </View>
  );
}

export default memo(AnimatedCheckbox);
