import React, { useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, textSize, fontFamily, radius, pill, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';
import { initDefaultPresets } from '../services/cardApi';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

// YouTube (24x24) — red bg + white play
const YOUTUBE_BG = 'M23.2314 6.3482c-0.2743 -1.0137 -1.066175 -1.80555 -2.079875 -2.07985 -1.823625 -0.49735 -9.163425 -0.49735 -9.163425 -0.49735s-7.339775 0.015075 -9.1634 0.512425c-1.0137075 0.2743 -1.805565 1.06615 -2.0798675 2.07985 -0.551613 3.24035 -0.7656271 8.17775 0.0150725 11.2885 0.2743025 1.0137 1.06616 1.80555 2.079845 2.07985 1.82365 0.49735 9.163425 0.49735 9.163425 0.49735s7.3398 0 9.163425 -0.49735c1.0137 -0.2743 1.80555 -1.06615 2.079875 -2.07985 0.58175 -3.244875 0.7611 -8.17925 -0.015075 -11.303575Z';
const YOUTUBE_PLAY = 'm9.652225 15.526575 6.08885 -3.526725 -6.08885 -3.5267v7.053425Z';

// Facebook (24x24) — blue circle + white f
const FACEBOOK_BG = 'M23.75 12C23.75 5.51065 18.48935 0.25 12 0.25S0.25 5.51065 0.25 12c0 5.864775 4.2968 10.725775 9.91405 11.60725V15.396475H7.180675V12h2.983375V9.411325c0 -2.94485 1.7542 -4.571475 4.43815 -4.571475 1.28555 0 2.630225 0.229475 2.630225 0.229475v2.891625h-1.48165c-1.45965 0 -1.914825 0.905725 -1.914825 1.83495V12h3.258775l-0.52095 3.396475H13.83595V23.60725C19.4532 22.725775 23.75 17.864775 23.75 12Z';
const FACEBOOK_F = 'M16.573775 15.396475 17.094725 12H13.83595v-2.2041c0 -0.929225 0.455175 -1.83495 1.914825 -1.83495h1.48165V5.069325s-1.344675 -0.229475 -2.630225 -0.229475c-2.68395 0 -4.43815 1.626625 -4.43815 4.571475V12H7.180675v3.396475h2.983375V23.60725C10.762275 23.701125 11.375425 23.75 12 23.75c0.624575 0 1.237725 -0.048875 1.83595 -0.14275V15.396475h2.737825Z';

// WhatsApp (96x96) — gradient green circle + white icon
const WA_BG = 'M3.20676 47.591c-.00237 7.924 2.06817 15.6613 6.00506 22.4808l-6.38174 23.301 23.84542-6.2524c6.5694 3.5806 13.9665 5.4706 21.4944 5.4725h.0199c24.7897 0 44.9692-20.1724 44.9796-44.9664.0048-12.0148-4.6698-23.3123-13.1629-31.812C71.5149 7.3153 60.2212 2.63217 48.1879 2.62695 23.3953 2.62695 3.21718 22.798 3.20676 47.591Z';
const WA_ICON = 'M36.55 28.1053c-.8723-1.9389-1.79-1.9777-2.6197-2.0118-.6789-.0289-1.4555-.0271-2.2311-.0271-.7766 0-2.0379.2919-3.1044 1.4565-1.0675 1.1651-4.0753 3.9815-4.0753 9.7093 0 5.7284 4.1724 11.2634 4.7538 12.041.5823.7761 8.0542 12.9065 19.8876 17.5731 9.8349 3.8781 11.8363 3.1068 13.9708 2.9125 2.1345-.1938 6.8882-2.8154 7.8581-5.5341.9704-2.7182.9704-5.0484.6795-5.535-.291-.4852-1.0675-.7766-2.2317-1.3585-1.1646-.5823-6.8882-3.3991-7.9552-3.7876-1.0675-.388-1.8436-.5818-2.6202.5837-.7761 1.1642-3.0059 3.7858-3.6853 4.5624-.679.778-1.3584.8751-2.5226.2928-1.1646-.5842-4.9143-1.8123-9.3624-5.7781-3.4612-3.086-5.7976-6.8968-6.477-8.0624-.679-1.1641-.0725-1.7948.5112-2.3752.5231-.5216 1.1647-1.3593 1.747-2.0388.5809-.6799.7746-1.1651 1.1627-1.9417.3885-.777.1943-1.4569-.0967-2.0392-.2914-.5823-2.5538-6.3396-3.5891-8.6418Z';

// Social Media button icon (24 viewport) — two paths
const SOCIAL_ICON_1 = 'M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0ZM9.93 9.14a1 1 0 0 1 -0.57 1.29 0.92 0.92 0 0 1 -0.36 0.07 1 1 0 0 1 -0.93 -0.64A1.22 1.22 0 0 0 7 9a1.22 1.22 0 0 0 -1.07 0.86 1 1 0 1 1 -1.86 -0.72A3.17 3.17 0 0 1 7 7a3.17 3.17 0 0 1 2.93 2.14Zm-3.67 3.39a1 1 0 0 1 1.21 0.72 1.9 1.9 0 0 0 2 1.25h5a1.92 1.92 0 0 0 2 -1.24 1 1 0 1 1 1.94 0.48 3.62 3.62 0 0 1 -0.92 1.56 0.16 0.16 0 0 0 0 0.22 2.47 2.47 0 0 1 0.72 1.75 2.51 2.51 0 0 1 -0.67 1.73A2.51 2.51 0 0 1 14 19l-2.46 -2.47a0.29 0.29 0 0 0 -0.18 -0.07H9.5a3.92 3.92 0 0 1 -4 -2.76 1 1 0 0 1 0.76 -1.17Zm12.1 -2.1a0.92 0.92 0 0 1 -0.36 0.07 1 1 0 0 1 -0.93 -0.64A1.22 1.22 0 0 0 16 9a1.22 1.22 0 0 0 -1.07 0.86 1 1 0 0 1 -1.86 -0.72 3.08 3.08 0 0 1 5.86 0 1 1 0 0 1 -0.57 1.29Z';
const SOCIAL_ICON_2 = 'm16.38 18.31 0.2 0a0.75 0.75 0 0 0 0.52 -0.92 4.78 4.78 0 0 0 -0.66 -1.06 0.25 0.25 0 0 0 -0.29 -0.08 4.75 4.75 0 0 1 -1.33 0.27 0.11 0.11 0 0 0 -0.1 0.07 0.09 0.09 0 0 0 0 0.11 0.68 0.68 0 0 0 0.27 0.24 5.82 5.82 0 0 1 0.65 0.86 0.76 0.76 0 0 0 0.74 0.51Z';

// XXX Sites button icon (24 viewport)
const XXX_ICON = 'M18.45 0.276a4.015 4.015 0 0 0 -4.015 4.015v0.084a0.623 0.623 0 0 1 0.22 0.007l0.011 0.002 0.065 0.01c0.06 0.009 0.154 0.019 0.274 0.025 0.24 0.011 0.584 0.004 0.98 -0.074 0.78 -0.155 1.782 -0.585 2.633 -1.733a0.625 0.625 0 0 1 0.944 -0.07c0.834 0.834 1.675 1.116 2.671 0.886a0.627 0.627 0 0 1 0.136 -0.016A4.017 4.017 0 0 0 18.45 0.276Zm-4.015 5.146 0.091 -0.428 -0.091 0.428Zm0 0.383v-0.192l0.012 0.002a4.354 4.354 0 0 0 0.498 0.052c0.321 0.016 0.768 0.005 1.281 -0.096 0.9 -0.178 1.995 -0.634 2.964 -1.69 0.95 0.744 2.034 1.048 3.275 0.776v1.148a4 4 0 0 1 -0.929 2.57L18.588 7.22a1.75 1.75 0 0 0 -2.363 1.928 4.011 4.011 0 0 1 -1.79 -3.343Zm-1 -1.514a5 5 0 0 1 0.329 -1.791H2.5C1.148 2.5 0 3.648 0 5v16.5C0 22.852 1.148 24 2.5 24h18c1.352 0 2.5 -1.148 2.5 -2.5v-4.971h-2V21.5c0 0.248 -0.252 0.5 -0.5 0.5h-18c-0.248 0 -0.5 -0.252 -0.5 -0.5V9h12.584a4.995 4.995 0 0 1 -1.15 -3.195V4.29Zm-6.894 8.61a0.75 0.75 0 1 0 -1.5 0 0.75 0.75 0 0 1 -0.75 0.75h-0.5a0.75 0.75 0 0 0 0 1.5h0.5c0.263 0 0.515 -0.046 0.75 -0.129l0 3.128H3.79a0.75 0.75 0 0 0 0 1.5h1.997l0.003 0 0.002 0H7.79a0.75 0.75 0 1 0 0 -1.5H6.54l0 -5.25Zm5.823 2a0.625 0.625 0 0 0 0 -1.25l-0.75 0a0.625 0.625 0 1 0 0 1.25h0.75Zm1.703 0.645a2.125 2.125 0 0 0 -1.703 -3.396l-0.75 0a2.125 2.125 0 0 0 -1.703 3.396 2.243 2.243 0 0 0 -0.672 1.604v0.25a2.25 2.25 0 0 0 2.25 2.25l1 0a2.25 2.25 0 0 0 2.25 -2.25v-0.25c0 -0.628 -0.257 -1.195 -0.672 -1.604ZM13.24 17.4a0.75 0.75 0 0 1 -0.75 0.75l-1 0a0.75 0.75 0 0 1 -0.75 -0.75v-0.25a0.75 0.75 0 0 1 0.75 -0.75h1a0.75 0.75 0 0 1 0.75 0.75v0.25Zm4.357 -8.903a0.5 0.5 0 0 1 0.536 -0.113l4.6 1.8a0.5 0.5 0 0 1 0.172 0.82l-0.87 0.87 1.746 1.746a0.75 0.75 0 0 1 -1.06 1.06l-1.747 -1.746 -0.87 0.87a0.5 0.5 0 0 1 -0.819 -0.172l-1.8 -4.6a0.5 0.5 0 0 1 0.112 -0.535ZM16.3 15.15a0.75 0.75 0 0 0 0 1.5h0.75v0.75a0.75 0.75 0 1 0 1.5 0v-0.75h0.75a0.75 0.75 0 1 0 0 -1.5h-0.75v-0.75a0.75 0.75 0 1 0 -1.5 0v0.75h-0.75Z';


export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleOnboardingComplete, userEmail, triggerRefresh } = useAuth();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Icon triangle animations
  const icon1Opacity = useRef(new Animated.Value(0)).current;
  const icon1TranslateY = useRef(new Animated.Value(s(30))).current;
  const icon2Opacity = useRef(new Animated.Value(0)).current;
  const icon2TranslateY = useRef(new Animated.Value(s(30))).current;
  const icon3Opacity = useRef(new Animated.Value(0)).current;
  const icon3TranslateY = useRef(new Animated.Value(s(30))).current;

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

    await AsyncStorage.setItem('onboarding_complete', 'true');

    if (choice === 'none') {
      await transitionRef.current?.animateOut('left');
      handleOnboardingComplete('none');
    } else {
      await AsyncStorage.setItem('show_block_hint', 'true');
      // Run preset init and exit animation in parallel, then trigger refresh so HomeScreen has the presets
      await Promise.all([
        userEmail ? initDefaultPresets(userEmail).then(() => triggerRefresh()).catch(() => {}) : Promise.resolve(),
        transitionRef.current?.animateOut('up'),
      ]);
      handleOnboardingComplete(choice);
    }
  };

  const ICON_SIZE = s(62);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTransition ref={transitionRef} from="right">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(32) }}>
          <Animated.View style={{ alignItems: 'center', width: '100%', transform: [{ translateY: contentTranslateY }] }}>

            {/* Icon triangle */}
            <View style={{ alignItems: 'center', marginBottom: s(32) }}>
              {/* Top icon — YouTube */}
              <Animated.View style={{ opacity: icon1Opacity, transform: [{ translateY: icon1TranslateY }], marginBottom: s(12) }}>
                <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
                  <Path d={YOUTUBE_BG} fill="#ff0000" />
                  <Path d={YOUTUBE_PLAY} fill="#ffffff" />
                </Svg>
              </Animated.View>

              {/* Bottom row — Facebook + WhatsApp */}
              <View style={{ flexDirection: 'row', gap: s(20) }}>
                <Animated.View style={{ opacity: icon2Opacity, transform: [{ translateY: icon2TranslateY }] }}>
                  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
                    <Path d={FACEBOOK_BG} fill="#1877f2" />
                    <Path d={FACEBOOK_F} fill="#ffffff" />
                  </Svg>
                </Animated.View>

                <Animated.View style={{ opacity: icon3Opacity, transform: [{ translateY: icon3TranslateY }] }}>
                  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 96 96">
                    <Defs>
                      <LinearGradient id="waGrad" x1="0" y1="96" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor="#1faf38" />
                        <Stop offset="1" stopColor="#60d669" />
                      </LinearGradient>
                    </Defs>
                    <Path d={WA_BG} fill="url(#waGrad)" />
                    <Path d={WA_ICON} fill="#ffffff" />
                  </Svg>
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
                    <View className="mr-3">
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                        <Path d={SOCIAL_ICON_1} />
                        <Path d={SOCIAL_ICON_2} />
                      </Svg>
                    </View>
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
                    <View className="mr-3">
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                        <Path d={XXX_ICON} fillRule="evenodd" clipRule="evenodd" />
                      </Svg>
                    </View>
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
