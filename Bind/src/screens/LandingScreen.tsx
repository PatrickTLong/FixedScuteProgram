import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Text as SvgText, Defs, Filter, FeGaussianBlur } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

// Glowing "Scute!" text - uses invisible Text for layout + absolute SVG for glow effect
function GlowingScuteText({ color, glowOpacity }: { color: string; glowOpacity: Animated.Value }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const listenerId = glowOpacity.addListener(({ value }) => {
      setOpacity(value);
    });
    return () => glowOpacity.removeListener(listenerId);
  }, [glowOpacity]);

  return (
    <View style={{ position: 'relative' }}>
      {/* Invisible text for proper baseline alignment and layout */}
      <Text style={{ opacity: 0 }} className="text-3xl font-nunito-bold">Scute!</Text>
      {/* SVG overlay with glow effect - positioned absolutely over the text */}
      <Svg
        style={{ position: 'absolute', top: -13.5, left: -12 }}
        width={130}
        height={60}
      >
        <Defs>
          <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </Filter>
        </Defs>
        {/* Glow layer */}
        <SvgText
          x={12}
          y={38}
          fontSize={30}
          fontFamily="Nunito-Bold"
          fill="#ffffff"
          opacity={opacity}
          filter="url(#glow)"
        >
          Scute!
        </SvgText>
        {/* Main text layer */}
        <SvgText
          x={12}
          y={38}
          fontSize={30}
          fontFamily="Nunito-Bold"
          fill={color}
        >
          Scute!
        </SvgText>
      </Svg>
    </View>
  );
}

interface Props {
  onSignIn: () => void;
  onGetStarted: () => void;
}

function LandingScreen({ onSignIn, onGetStarted }: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // Pulsating glow animation for "Scute!" text
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start slow pulsating animation (2 second cycle - matches Hold to Begin Locking)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [glowOpacity]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View className="flex-1 justify-center items-center px-8">
        {/* Scute Logo */}
        <Image
          source={require('../frontassets/TrueScute-Photoroom.png')}
          className="w-72 h-72 mb-8"
          resizeMode="contain"
          style={{ tintColor: colors.logoTint, marginTop: -60 }}
        />

        {/* Title */}
        <View className="flex-row items-baseline justify-center mb-4">
          <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold">This is </Text>
          {isDark ? (
            <GlowingScuteText color={colors.text} glowOpacity={glowOpacity} />
          ) : (
            <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold">Scute!</Text>
          )}
        </View>

        {/* Subtitle */}
        <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito leading-6 px-4">
          A simple way to block distractions and enjoy more of what matters.
        </Text>
      </View>

      {/* Bottom Section */}
      <View className="px-6 pb-12">
        {/* Get Started Button */}
        <TouchableOpacity
          onPress={onGetStarted}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.text }}
          className="rounded-full py-4 items-center mb-4"
        >
          <Text style={{ color: colors.bg }} className="text-lg font-nunito-semibold">
            Get Started
          </Text>
        </TouchableOpacity>

        {/* Spacer to maintain button position */}
        <View className="items-center py-2">
          <Text className="text-base font-nunito" style={{ opacity: 0 }}>
            Placeholder
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
