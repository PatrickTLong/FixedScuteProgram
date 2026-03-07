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
import { useTheme, textSize, fontFamily, radius, buttonPadding, haptics, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import InfoModal from '../components/InfoModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

const SCUTE_ICON_PATH =
  'M360,650.4375 L316.5,612.9375 C266,568.9375 224.25,530.9375 191.25,498.9375 C158.25,466.9375 132,438.1875 112.5,412.6875 C93,387.1875 79.375,363.6875 71.625,342.1875 C63.875,320.6875 60,298.4375 60,275.4375 C60,228.4375 75.75,189.1875 107.25,157.6875 C138.75,126.1875 178,110.4375 225,110.4375 C251,110.4375 275.75,115.9375 299.25,126.9375 C322.75,137.9375 343,153.4375 360,173.4375 C377,153.4375 397.25,137.9375 420.75,126.9375 C444.25,115.9375 469,110.4375 495,110.4375 C542,110.4375 581.25,126.1875 612.75,157.6875 C644.25,189.1875 660,228.4375 660,275.4375 C660,298.4375 656.125,320.6875 648.375,342.1875 C640.625,363.6875 627,387.1875 607.5,412.6875 C588,438.1875 561.75,466.9375 528.75,498.9375 C495.75,530.9375 454,568.9375 403.5,612.9375ZM446.25,389.4375 L273.75,389.4375 C273.75,474.4375 302.5,516.9375 360,516.9375 C417.5,516.9375 446.25,474.4375 446.25,389.4375ZM204.375,251.0625 C189.625,264.8125 179.25,283.6875 173.25,307.6875 L216.75,318.1875 C219.75,305.1875 224.75,294.8125 231.75,287.0625 C238.75,279.3125 246.5,275.4375 255,275.4375 C263.5,275.4375 271.25,279.3125 278.25,287.0625 C285.25,294.8125 290.25,305.1875 293.25,318.1875 L336.75,307.6875 C330.75,283.6875 320.375,264.8125 305.625,251.0625 C290.875,237.3125 274,230.4375 255,230.4375 C236,230.4375 219.125,237.3125 204.375,251.0625ZM414.375,251.0625 C399.625,264.8125 389.25,283.6875 383.25,307.6875 L426.75,318.1875 C429.75,305.1875 434.75,294.8125 441.75,287.0625 C448.75,279.3125 456.5,275.4375 465,275.4375 C473.5,275.4375 481.25,279.3125 488.25,287.0625 C495.25,294.8125 500.25,305.1875 503.25,318.1875 L546.75,307.6875 C540.75,283.6875 530.375,264.8125 515.625,251.0625 C500.875,237.3125 484,230.4375 465,230.4375 C446,230.4375 429.125,237.3125 414.375,251.0625Z';

const APPLE_LOGO_PATH =
  'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z';

const ENVELOPE_PATH =
  'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';

const GOOGLE_LOGO_PATHS = [
  { d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z', fill: '#4285F4' },
  { d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', fill: '#34A853' },
  { d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', fill: '#FBBC05' },
  { d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fill: '#EA4335' },
];

GoogleSignin.configure({
  webClientId: '193061003488-ksk4uod4qllq9avl76vjb2df172ohh2n.apps.googleusercontent.com',
  offlineAccess: true,
});

function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleLogin } = useAuth();
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Phase 1 & 2: Logo bounce + text fade (existing)
  const slideValue = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Phase 3: Content slides up + buttons pop in (staggered)
  const contentShift = useRef(new Animated.Value(0)).current;
  const btn1Opacity = useRef(new Animated.Value(0)).current;
  const btn1Scale = useRef(new Animated.Value(0.7)).current;
  const btn2Opacity = useRef(new Animated.Value(0)).current;
  const btn2Scale = useRef(new Animated.Value(0.7)).current;
  const btn3Opacity = useRef(new Animated.Value(0)).current;
  const btn3Scale = useRef(new Animated.Value(0.7)).current;

  const [googleLoading, setGoogleLoading] = useState(false);
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
        // Phase 3: Slide content up, then stagger buttons in with bouncy springs
        Animated.timing(contentShift, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();

        // Stagger each button with a bubbly pop-in
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

  async function handleGooglePress() {
    if (haptics.googleSignIn.enabled) {
      triggerHaptic(haptics.googleSignIn.type);
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token received from Google');

      const response = await fetch(`${API_URL}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: userInfo.data?.user.email,
          name: userInfo.data?.user.name,
        }),
      });
      const data = await response.json();

      if (response.ok && data.token) {
        await setAuthToken(data.token);
        await AsyncStorage.setItem('user_email', userInfo.data?.user.email || '');
        await transitionRef.current?.animateOut('left');
        handleLogin(userInfo.data?.user.email || '');
      } else {
        throw new Error(data.error || 'Google sign-in failed');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showModal('Error', 'Google Play Services not available');
      } else if (error.message?.includes('getTokens') || error.message?.includes('token')) {
        // User backed out before completing
      } else {
        showModal('Google Sign-In Error', error.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

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

          {/* Auth buttons — staggered bubbly pop-in */}
          <View style={{ width: '100%', marginTop: s(40) }}>
            <Animated.View style={{ opacity: btn1Opacity, transform: [{ scale: btn1Scale }], marginBottom: s(12) }}>
              <TouchableOpacity
                onPress={handleGooglePress}
                disabled={googleLoading}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.border,
                  position: 'relative',
                }}
                className={`${radius.full} ${pill} items-center justify-center`}
              >
                <View style={{ opacity: googleLoading ? 0 : 1 }} className="flex-row items-center justify-center">
                  <View className="mr-3">
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      {GOOGLE_LOGO_PATHS.map((p, i) => (
                        <Path key={i} d={p.d} fill={p.fill} />
                      ))}
                    </Svg>
                  </View>
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Continue with Google
                  </Text>
                </View>
                {googleLoading && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                    <LoadingSpinner size={s(20)} color="#000000" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: btn2Opacity, transform: [{ scale: btn2Scale }], marginBottom: s(12) }}>
              <TouchableOpacity
                onPress={handleApplePress}
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
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                      <Path d={APPLE_LOGO_PATH} />
                    </Svg>
                  </View>
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Continue with Apple
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ opacity: btn3Opacity, transform: [{ scale: btn3Scale }] }}>
              <TouchableOpacity
                onPress={handleEmailPress}
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
          </View>
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
