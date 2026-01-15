import React, { useEffect, useRef, memo } from 'react';
import { Image, Animated, ImageSourcePropType } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface GlintLogoProps {
  source: ImageSourcePropType;
  width: number;
  height: number;
  tintColor?: string;
  style?: object;
  animatedStyle?: object;
}

function GlintLogo({ source, width, height, tintColor, style, animatedStyle }: GlintLogoProps) {
  const { isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [shimmerAnim]);

  // Dark mode: fade between 55% and 100%
  // Light mode: fade between 60% and 100% (slightly higher min for better visibility on light bg)
  const minOpacity = isDark ? 0.55 : 0.6;

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [minOpacity, 1, minOpacity],
  });

  return (
    <Animated.View style={[{ width, height }, animatedStyle]}>
      <Animated.Image
        source={source}
        style={[
          { width, height, tintColor, opacity: shimmerOpacity },
          style,
        ]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default memo(GlintLogo);
