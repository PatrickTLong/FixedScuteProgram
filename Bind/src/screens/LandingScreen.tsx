import React, { memo, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onSignIn: () => void;
  onGetStarted: () => void;
}

function LandingScreen({ onSignIn, onGetStarted }: Props) {
  const { colors } = useTheme();

  // Pulsating glow animation for "Scute!" text
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulsating animation (800ms cycle)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 400,
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
          source={require('../frontassets/scutelogo.png')}
          className="w-72 h-72 mb-8"
          resizeMode="contain"
          style={{ tintColor: colors.logoTint, marginTop: -60 }}
        />

        {/* Title */}
        <View className="flex-row items-baseline justify-center mb-4">
          <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold">This is </Text>
          <Animated.Text
            style={{
              color: colors.text,
              textShadowColor: '#ffffff',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 20],
              }),
            }}
            className="text-3xl font-nunito-bold"
          >
            Scute!
          </Animated.Text>
        </View>

        {/* Subtitle */}
        <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito leading-6 px-4">
          A simple way to block distractions and enjoy more of what matters.
        </Text>
      </View>

      {/* Bottom Section */}
      <View className="px-6 pb-8">
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
