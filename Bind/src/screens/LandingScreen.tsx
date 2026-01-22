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
import { lightTap } from '../utils/haptics';

// Glowing logo component - adds animated glow effect around the logo
function GlowingLogo({ glowOpacity, tintColor }: { glowOpacity: Animated.Value; tintColor?: string }) {
  return (
    <View style={{ position: 'relative' }}>
      {/* Glow layer - subtle blur effect */}
      <Animated.Image
        source={require('../frontassets/TrueScute-Photoroom.png')}
        className="w-96 h-96"
        resizeMode="contain"
        style={{
          position: 'absolute',
          tintColor: '#ffffff',
          opacity: glowOpacity,
          transform: [{ scale: 1.02 }],
        }}
        blurRadius={8}
      />
      {/* Main logo */}
      <Image
        source={require('../frontassets/TrueScute-Photoroom.png')}
        className="w-96 h-96"
        resizeMode="contain"
        style={{ tintColor }}
      />
    </View>
  );
}

interface Props {
  onSignIn: () => void;
  onGetStarted: () => void;
}

function LandingScreen({ onGetStarted }: Props) {
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
      <View className="flex-1 justify-center items-center px-6">
        {/* All content centered together */}
        <View className="items-center w-full" style={{ marginTop: -140 }}>
          {/* Scute Logo with glow effect in dark mode */}
          {isDark ? (
            <GlowingLogo glowOpacity={glowOpacity} tintColor={colors.logoTint} />
          ) : (
            <Image
              source={require('../frontassets/TrueScute-Photoroom.png')}
              className="w-96 h-96"
              resizeMode="contain"
              style={{ tintColor: colors.logoTint }}
            />
          )}

          {/* Subtitle - reduced top margin */}
          <Text style={{ color: colors.textSecondary, marginTop: -40 }} className="text-center text-lg font-nunito leading-7 px-4 mb-8">
            Block distractions with minimal friction and maximum control.
          </Text>

          {/* Get Started Button */}
          <TouchableOpacity
            onPress={() => { lightTap(); onGetStarted(); }}
            activeOpacity={0.8}
            style={{ backgroundColor: colors.text }}
            className="rounded-full py-4 items-center w-full"
          >
            <Text style={{ color: colors.bg }} className="text-lg font-nunito-semibold">
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
