import { memo, useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme, textSize, fontFamily, radius, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import GoogleSignInBtn from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import InfoModal from '../components/InfoModal';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

const SCUTE_ICON_PATH =
  'M360,650.4375 L316.5,612.9375 C266,568.9375 224.25,530.9375 191.25,498.9375 C158.25,466.9375 132,438.1875 112.5,412.6875 C93,387.1875 79.375,363.6875 71.625,342.1875 C63.875,320.6875 60,298.4375 60,275.4375 C60,228.4375 75.75,189.1875 107.25,157.6875 C138.75,126.1875 178,110.4375 225,110.4375 C251,110.4375 275.75,115.9375 299.25,126.9375 C322.75,137.9375 343,153.4375 360,173.4375 C377,153.4375 397.25,137.9375 420.75,126.9375 C444.25,115.9375 469,110.4375 495,110.4375 C542,110.4375 581.25,126.1875 612.75,157.6875 C644.25,189.1875 660,228.4375 660,275.4375 C660,298.4375 656.125,320.6875 648.375,342.1875 C640.625,363.6875 627,387.1875 607.5,412.6875 C588,438.1875 561.75,466.9375 528.75,498.9375 C495.75,530.9375 454,568.9375 403.5,612.9375ZM446.25,389.4375 L273.75,389.4375 C273.75,474.4375 302.5,516.9375 360,516.9375 C417.5,516.9375 446.25,474.4375 446.25,389.4375ZM204.375,251.0625 C189.625,264.8125 179.25,283.6875 173.25,307.6875 L216.75,318.1875 C219.75,305.1875 224.75,294.8125 231.75,287.0625 C238.75,279.3125 246.5,275.4375 255,275.4375 C263.5,275.4375 271.25,279.3125 278.25,287.0625 C285.25,294.8125 290.25,305.1875 293.25,318.1875 L336.75,307.6875 C330.75,283.6875 320.375,264.8125 305.625,251.0625 C290.875,237.3125 274,230.4375 255,230.4375 C236,230.4375 219.125,237.3125 204.375,251.0625ZM414.375,251.0625 C399.625,264.8125 389.25,283.6875 383.25,307.6875 L426.75,318.1875 C429.75,305.1875 434.75,294.8125 441.75,287.0625 C448.75,279.3125 456.5,275.4375 465,275.4375 C473.5,275.4375 481.25,279.3125 488.25,287.0625 C495.25,294.8125 500.25,305.1875 503.25,318.1875 L546.75,307.6875 C540.75,283.6875 530.375,264.8125 515.625,251.0625 C500.875,237.3125 484,230.4375 465,230.4375 C446,230.4375 429.125,237.3125 414.375,251.0625Z';

const APPLE_LOGO_PATH =
  'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z';

const ENVELOPE_PATH =
  'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';

function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleLogin } = useAuth();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Phase 1 & 2: Logo bounce + text fade (existing)
  const slideValue = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Phase 3: Content slides up + buttons fade in
  const contentShift = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(150)).current;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    // Phase 1: Bouncy slide-in from bottom
    Animated.spring(slideValue, {
      toValue: 0,
      speed: 14,
      bounciness: 16,
      useNativeDriver: true,
    }).start(() => {
      // Phase 2: Fade in welcome text
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Phase 3: Immediately slide content up and reveal buttons
        Animated.parallel([
          Animated.timing(contentShift, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(buttonsOpacity, {
            toValue: 1,
            duration: 400,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonsSlide, {
            toValue: 0,
            duration: 400,
            delay: 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  }, []);

  const slideTranslateY = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const slideOpacity = slideValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // Buttons in the flex column push the logo above true center by ~half their height.
  // Start offset compensates so the logo appears centered; end value shifts it up further.
  const contentTranslateY = contentShift.interpolate({
    inputRange: [0, 1],
    outputRange: [s(90), -s(30)],
  });

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  const handleGoogleSuccess = async (email: string) => {
    await transitionRef.current?.animateOut('left');
    handleLogin(email);
  };

  const handleApplePress = () => {
    showModal('Coming Soon', 'Apple Sign-In is coming soon.');
  };

  const handleEmailPress = async () => {
    if (haptics.landingTap.enabled) {
      triggerHaptic(haptics.landingTap.type);
    }
    await transitionRef.current?.animateOut('left');
    navigation.navigate('GetStarted');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTransition ref={transitionRef}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(32) }}>
        {/* All content in one flex column — naturally adapts to any screen size */}
        <Animated.View style={{ alignItems: 'center', width: '100%', transform: [{ translateY: contentTranslateY }] }}>
          <Animated.View style={{ transform: [{ translateY: slideTranslateY }], opacity: slideOpacity }}>
            <Svg width={s(120)} height={s(120)} viewBox="0 0 720 720" fill={colors.text}>
              <Path d={SCUTE_ICON_PATH} fillRule="evenodd" />
            </Svg>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, marginTop: s(24) }}>
            <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}>
              Welcome to Scute!
            </Text>
          </Animated.View>

          {/* Auth buttons — in natural flow below text */}
          <Animated.View style={{ width: '100%', marginTop: s(40), opacity: buttonsOpacity, transform: [{ translateY: buttonsSlide }] }}>
            <View style={{ marginBottom: s(12) }}>
              <GoogleSignInBtn
                onSuccess={handleGoogleSuccess}
                onError={(error) => showModal('Google Sign-In Error', error)}
                light
                noShadow
              />
            </View>

            <TouchableOpacity
              onPress={handleApplePress}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: s(buttonPadding.standard),
                marginBottom: s(12),
              }}
              className={`${radius.full} items-center justify-center`}
            >
              <View className="flex-row items-center justify-center">
                <View className="mr-3">
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                    <Path d={APPLE_LOGO_PATH} />
                  </Svg>
                </View>
                <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Continue with Apple
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailPress}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: s(buttonPadding.standard),
              }}
              className={`${radius.full} items-center justify-center`}
            >
              <View className="flex-row items-center justify-center">
                <View className="mr-3">
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                    <Path d={ENVELOPE_PATH} />
                  </Svg>
                </View>
                <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Continue with Email
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
      </ScreenTransition>

      <InfoModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
