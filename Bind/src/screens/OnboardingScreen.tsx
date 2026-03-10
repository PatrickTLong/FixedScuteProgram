import React, { useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, textSize, fontFamily, radius, pill, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

const SCUTE_ICON_PATH =
  'M360,650.4375 L316.5,612.9375 C266,568.9375 224.25,530.9375 191.25,498.9375 C158.25,466.9375 132,438.1875 112.5,412.6875 C93,387.1875 79.375,363.6875 71.625,342.1875 C63.875,320.6875 60,298.4375 60,275.4375 C60,228.4375 75.75,189.1875 107.25,157.6875 C138.75,126.1875 178,110.4375 225,110.4375 C251,110.4375 275.75,115.9375 299.25,126.9375 C322.75,137.9375 343,153.4375 360,173.4375 C377,153.4375 397.25,137.9375 420.75,126.9375 C444.25,115.9375 469,110.4375 495,110.4375 C542,110.4375 581.25,126.1875 612.75,157.6875 C644.25,189.1875 660,228.4375 660,275.4375 C660,298.4375 656.125,320.6875 648.375,342.1875 C640.625,363.6875 627,387.1875 607.5,412.6875 C588,438.1875 561.75,466.9375 528.75,498.9375 C495.75,530.9375 454,568.9375 403.5,612.9375ZM446.25,389.4375 L273.75,389.4375 C273.75,474.4375 302.5,516.9375 360,516.9375 C417.5,516.9375 446.25,474.4375 446.25,389.4375ZM204.375,251.0625 C189.625,264.8125 179.25,283.6875 173.25,307.6875 L216.75,318.1875 C219.75,305.1875 224.75,294.8125 231.75,287.0625 C238.75,279.3125 246.5,275.4375 255,275.4375 C263.5,275.4375 271.25,279.3125 278.25,287.0625 C285.25,294.8125 290.25,305.1875 293.25,318.1875 L336.75,307.6875 C330.75,283.6875 320.375,264.8125 305.625,251.0625 C290.875,237.3125 274,230.4375 255,230.4375 C236,230.4375 219.125,237.3125 204.375,251.0625ZM414.375,251.0625 C399.625,264.8125 389.25,283.6875 383.25,307.6875 L426.75,318.1875 C429.75,305.1875 434.75,294.8125 441.75,287.0625 C448.75,279.3125 456.5,275.4375 465,275.4375 C473.5,275.4375 481.25,279.3125 488.25,287.0625 C495.25,294.8125 500.25,305.1875 503.25,318.1875 L546.75,307.6875 C540.75,283.6875 530.375,264.8125 515.625,251.0625 C500.875,237.3125 484,230.4375 465,230.4375 C446,230.4375 429.125,237.3125 414.375,251.0625Z';

// Phosphor filled icons (256 viewport)
const CHAT_PATH = 'M232,128A104,104,0,0,1,79.12,219.82L45.07,228.69a16,16,0,0,1-19.76-19.76l8.87-34.05A104,104,0,1,1,232,128Z';
const SHIELD_PATH = 'M208,40H48A16,16,0,0,0,32,56v58.77c0,89.62,75.82,119.34,91,124.38a15.44,15.44,0,0,0,10,0c15.18-5.05,91-34.76,91-124.38V56A16,16,0,0,0,208,40Z';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleOnboardingComplete } = useAuth();

  // Phase 1: Logo slides up from bottom
  const logoSlide = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: Buttons stagger in
  const contentShift = useRef(new Animated.Value(0)).current;
  const btn1Opacity = useRef(new Animated.Value(0)).current;
  const btn1Scale = useRef(new Animated.Value(0.7)).current;
  const btn2Opacity = useRef(new Animated.Value(0)).current;
  const btn2Scale = useRef(new Animated.Value(0.7)).current;
  const btn3Opacity = useRef(new Animated.Value(0)).current;
  const btn3Scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.spring(logoSlide, {
      toValue: 0,
      speed: 14,
      bounciness: 16,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(contentShift, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();

        const staggerDelay = 80;
        [
          { opacity: btn1Opacity, scale: btn1Scale },
          { opacity: btn2Opacity, scale: btn2Scale },
          { opacity: btn3Opacity, scale: btn3Scale },
        ].forEach(({ opacity, scale }, i) => {
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.spring(scale, {
                toValue: 1,
                speed: 10,
                bounciness: 14,
                useNativeDriver: true,
              }),
            ]).start();
          }, i * staggerDelay);
        });
      });
    });
  }, []);

  const logoTranslateY = logoSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const logoOpacity = logoSlide.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  const contentTranslateY = contentShift.interpolate({
    inputRange: [0, 1],
    outputRange: [s(90), -s(30)],
  });

  const handleChoice = async (choice: 'social_media' | 'xxx' | 'none') => {
    if (haptics.landingTap?.enabled) {
      triggerHaptic(haptics.landingTap.type);
    }

    await AsyncStorage.setItem('onboarding_complete', 'true');

    if (choice === 'none') {
      handleOnboardingComplete('none');
    } else {
      await AsyncStorage.setItem('show_block_hint', 'true');
      handleOnboardingComplete(choice);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(32) }}>
        <Animated.View style={{ alignItems: 'center', width: '100%', transform: [{ translateY: contentTranslateY }] }}>
          {/* Scute logo */}
          <Animated.View style={{ transform: [{ translateY: logoTranslateY }], opacity: logoOpacity }}>
            <Svg width={s(120)} height={s(120)} viewBox="0 0 720 720" fill={colors.text}>
              <Path d={SCUTE_ICON_PATH} fillRule="evenodd" />
            </Svg>
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ opacity: textOpacity, marginTop: s(24) }}>
            <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}>
              You're almost ready!
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: s(8) }} className={`${textSize.small} ${fontFamily.regular} text-center`}>
              What would you like to block?
            </Text>
          </Animated.View>

          {/* Choice buttons */}
          <View style={{ width: '100%', marginTop: s(40) }}>
            {/* Social Media */}
            <Animated.View style={{ opacity: btn1Opacity, transform: [{ scale: btn1Scale }], marginBottom: s(12) }}>
              <TouchableOpacity
                onPress={() => handleChoice('social_media')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                className={`${radius.full} ${pill} items-center justify-center`}
              >
                <View className="flex-row items-center justify-center">
                  <View className="mr-3">
                    <Svg width={20} height={20} viewBox="0 0 256 256" fill="#000000">
                      <Path d={CHAT_PATH} />
                    </Svg>
                  </View>
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Social Media
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* XXX Sites */}
            <Animated.View style={{ opacity: btn2Opacity, transform: [{ scale: btn2Scale }], marginBottom: s(12) }}>
              <TouchableOpacity
                onPress={() => handleChoice('xxx')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                className={`${radius.full} ${pill} items-center justify-center`}
              >
                <View className="flex-row items-center justify-center">
                  <View className="mr-3">
                    <Svg width={20} height={20} viewBox="0 0 256 256" fill="#000000">
                      <Path d={SHIELD_PATH} />
                    </Svg>
                  </View>
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    XXX Sites
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* None of these */}
            <Animated.View style={{ opacity: btn3Opacity, transform: [{ scale: btn3Scale }] }}>
              <TouchableOpacity
                onPress={() => handleChoice('none')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                className={`${radius.full} ${pill} items-center justify-center`}
              >
                <View className="flex-row items-center justify-center">
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    None of these
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
