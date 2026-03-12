import React, { useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, textSize, fontFamily, radius, pill, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';
import { setUserFlag } from '../services/cardApi';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';


export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleStartOnboardingLoading } = useAuth();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Icon entry animations
  const icon1Opacity = useRef(new Animated.Value(0)).current;
  const icon1TranslateY = useRef(new Animated.Value(s(30))).current;
  const icon2Opacity = useRef(new Animated.Value(0)).current;
  const icon2TranslateY = useRef(new Animated.Value(s(30))).current;
  const icon3Opacity = useRef(new Animated.Value(0)).current;
  const icon3TranslateY = useRef(new Animated.Value(s(30))).current;

  // Floating animation (staggered per icon)
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  // Title fade
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Content shift + button stagger
  const contentShift = useRef(new Animated.Value(0)).current;
  const btn1Opacity = useRef(new Animated.Value(0)).current;
  const btn1Scale = useRef(new Animated.Value(0.7)).current;
  const btn2Opacity = useRef(new Animated.Value(0)).current;
  const btn2Scale = useRef(new Animated.Value(0.7)).current;
  const btn3Opacity = useRef(new Animated.Value(0)).current;
  const btn3Scale = useRef(new Animated.Value(0.7)).current;
  const btn4Opacity = useRef(new Animated.Value(0)).current;
  const btn4Scale = useRef(new Animated.Value(0.7)).current;

  const animateIcon = (opacity: Animated.Value, translateY: Animated.Value) =>
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 12, bounciness: 10, useNativeDriver: true }),
    ]);

  useEffect(() => {
    // Icons fly in staggered
    setTimeout(() => animateIcon(icon1Opacity, icon1TranslateY).start(), 0);
    setTimeout(() => animateIcon(icon2Opacity, icon2TranslateY).start(), 120);
    setTimeout(() => animateIcon(icon3Opacity, icon3TranslateY).start(), 240);

    // Start floating after icons land (staggered)
    const startFloat = (val: Animated.Value, delay: number) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ).start();
      }, delay);
    };
    startFloat(float1, 400);
    startFloat(float2, 600);
    startFloat(float3, 800);

    // Text fades in after icons
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 500);

    // Content shifts + buttons stagger in
    setTimeout(() => {
      Animated.timing(contentShift, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      [
        { opacity: btn1Opacity, scale: btn1Scale },
        { opacity: btn2Opacity, scale: btn2Scale },
        { opacity: btn3Opacity, scale: btn3Scale },
        { opacity: btn4Opacity, scale: btn4Scale },
      ].forEach(({ opacity, scale }, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, speed: 10, bounciness: 14, useNativeDriver: true }),
          ]).start();
        }, i * 80);
      });
    }, 650);
  }, []);

  const contentTranslateY = contentShift.interpolate({
    inputRange: [0, 1],
    outputRange: [s(80), -s(20)],
  });

  const handleChoice = async (choice: 'social_media' | 'xxx' | 'both' | 'none') => {
    if (haptics.landingTap?.enabled) {
      triggerHaptic(haptics.landingTap.type);
    }

    // Save to backend (per-user, fire-and-forget) + local cache
    setUserFlag('onboarding_complete', true);
    await AsyncStorage.setItem('onboarding_complete', 'true');

    if (choice === 'none') {
      await transitionRef.current?.animateOut('left');
    } else {
      await AsyncStorage.setItem('show_block_hint', 'true');
      await transitionRef.current?.animateOut('up');
    }

    handleStartOnboardingLoading(choice);
  };

  const floatY1 = float1.interpolate({ inputRange: [0, 1], outputRange: [s(4), -s(4)] });
  const floatY2 = float2.interpolate({ inputRange: [0, 1], outputRange: [s(4), -s(4)] });
  const floatY3 = float3.interpolate({ inputRange: [0, 1], outputRange: [s(4), -s(4)] });

  const ICON_SIZE = s(62);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTransition ref={transitionRef} from="right">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(32) }}>
          <Animated.View style={{ alignItems: 'center', width: '100%', transform: [{ translateY: contentTranslateY }] }}>

            {/* Icon triangle — floating */}
            <View style={{ alignItems: 'center', marginBottom: s(32) }}>
              {/* Top icon — YouTube */}
              <Animated.View style={{ opacity: icon1Opacity, transform: [{ translateY: icon1TranslateY }, { translateY: floatY1 }], marginBottom: s(12) }}>
                <FontAwesome5 name="youtube" brand size={ICON_SIZE} color="#ffffff" />
              </Animated.View>

              {/* Bottom row — Facebook + Reddit */}
              <View style={{ flexDirection: 'row', gap: s(20) }}>
                <Animated.View style={{ opacity: icon2Opacity, transform: [{ translateY: icon2TranslateY }, { translateY: floatY2 }] }}>
                  <FontAwesome5 name="facebook-square" brand size={ICON_SIZE} color="#ffffff" />
                </Animated.View>

                <Animated.View style={{ opacity: icon3Opacity, transform: [{ translateY: icon3TranslateY }, { translateY: floatY3 }] }}>
                  <FontAwesome5 name="reddit-alien" brand size={ICON_SIZE} color="#ffffff" />
                </Animated.View>
              </View>
            </View>

            {/* Title */}
            <Animated.View style={{ opacity: textOpacity }}>
              <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}>
                You're almost ready!
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: s(8) }} className={`${textSize.small} ${fontFamily.regular} text-center`}>
                What would you like to block?
              </Text>
            </Animated.View>

            {/* Choice buttons */}
            <View style={{ width: '100%', marginTop: s(32) }}>
              {/* Social Media Apps/Sites */}
              <Animated.View style={{ opacity: btn1Opacity, transform: [{ scale: btn1Scale }], marginBottom: s(12) }}>
                <TouchableOpacity
                  onPress={() => handleChoice('social_media')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border }}
                  className={`${radius.full} ${pill} items-center justify-center`}
                >
                  <View className="flex-row items-center justify-center">
                    <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      Social Media Apps/Sites
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* XXX Sites */}
              <Animated.View style={{ opacity: btn2Opacity, transform: [{ scale: btn2Scale }], marginBottom: s(12) }}>
                <TouchableOpacity
                  onPress={() => handleChoice('xxx')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border }}
                  className={`${radius.full} ${pill} items-center justify-center`}
                >
                  <View className="flex-row items-center justify-center">
                    <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      XXX Sites
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Both */}
              <Animated.View style={{ opacity: btn3Opacity, transform: [{ scale: btn3Scale }], marginBottom: s(12) }}>
                <TouchableOpacity
                  onPress={() => handleChoice('both')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border }}
                  className={`${radius.full} ${pill} items-center justify-center`}
                >
                  <View className="flex-row items-center justify-center">
                    <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      Both of these
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* None of these */}
              <Animated.View style={{ opacity: btn4Opacity, transform: [{ scale: btn4Scale }] }}>
                <TouchableOpacity
                  onPress={() => handleChoice('none')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border }}
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
      </ScreenTransition>
    </SafeAreaView>
  );
}
