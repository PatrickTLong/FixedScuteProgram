import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Text,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme , textSize, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap } from '../utils/haptics';

interface Props {
  onSignIn: () => void;
  onGetStarted: () => void;
}

function LandingScreen({ onGetStarted }: Props) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  // Fade in animation for "Tap to continue" text
  const tapTextOpacity = useRef(new Animated.Value(0)).current;
  const [showTapText, setShowTapText] = useState(false);

  useEffect(() => {
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
      clearTimeout(timeout);
    };
  }, [tapTextOpacity]);

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
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
            Tap to continue...
          </Text>
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
