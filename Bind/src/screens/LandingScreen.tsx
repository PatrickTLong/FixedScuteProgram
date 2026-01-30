import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
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
          transform: [{ scale: 1.01 }],
        }}
        blurRadius={4}
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
  const { s } = useResponsive();
  const isDark = theme === 'dark';

  // Pulsating glow animation for logo
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Fade in animation for "Tap to continue" text
  const tapTextOpacity = useRef(new Animated.Value(0)).current;
  const [showTapText, setShowTapText] = useState(false);

  useEffect(() => {
    // Start slow pulsating animation (2 second cycle)
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

    // Show "Tap to continue" after a short delay with fade in
    const timeout = setTimeout(() => {
      setShowTapText(true);
      Animated.timing(tapTextOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 500);

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [glowOpacity, tapTextOpacity]);

  const handleTap = () => {
    if (showTapText) {
      lightTap();
      onGetStarted();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable onPress={handleTap} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Logo centered */}
        <Image
          source={require('../frontassets/TrueScute-Photoroom.png')}
          className="w-96 h-96"
          resizeMode="contain"
          style={{ tintColor: colors.logoTint }}
        />

        {/* Tap to continue text below logo */}
        <Animated.View style={{ opacity: tapTextOpacity, marginTop: s(24) }}>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
            Tap to continue...
          </Text>
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
