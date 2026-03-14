import React, { useState, useRef, useCallback, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import GoogleSignInBtn from '../components/GoogleSignInButton';
import HeaderIconButton from '../components/HeaderIconButton';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, pill, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef, TransitionDirection } from '../components/ScreenTransition';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';

const OpenEyeIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="20 80 600 480" width={size} height={size}>
    <Path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z" fill={color} />
  </Svg>
);

const CloseEyesIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 640 640" width={size} height={size}>
    <Path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM236.5 202.7C260 185.9 288.9 176 320 176C399.5 176 464 240.5 464 320C464 351.1 454.1 379.9 437.3 403.5L402.6 368.8C415.3 347.4 419.6 321.1 412.7 295.1C399 243.9 346.3 213.5 295.1 227.2C286.5 229.5 278.4 232.9 271.1 237.2L236.4 202.5zM357.3 459.1C345.4 462.3 332.9 464 320 464C240.5 464 176 399.5 176 320C176 307.1 177.7 294.6 180.9 282.7L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L357.4 459.2z" fill={color} />
  </Svg>
);

const SendEmailIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path d="M23.61 0.23a1.05 1.05 0 0 0 -1.14 -0.11L0.83 11.65A1.54 1.54 0 0 0 1 14.44l3.26 1.38a0.69 0.69 0 0 0 0 0.25l2.5 6.74a1.82 1.82 0 0 0 2.93 0.72l3.4 -3.76a0.26 0.26 0 0 1 0.29 -0.06l3.15 1.34a1.63 1.63 0 0 0 1.3 0 1.53 1.53 0 0 0 0.83 -1L24 1.3a1 1 0 0 0 -0.39 -1.07ZM5.84 16.05 15.53 8a0.23 0.23 0 0 1 0.34 0 0.22 0.22 0 0 1 0 0.33l-7.22 8.86a0.75 0.75 0 0 0 -0.16 0.35l-0.63 3.95Z" fill={color} />
  </Svg>
);

const LoginKeyIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 256 256" width={size} height={size}>
    <Path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-72,78.63V184a8,8,0,0,1-16,0V158.63a24,24,0,1,1,16,0ZM160,80H96V56a32,32,0,0,1,64,0Z" fill={color} />
  </Svg>
);

const APPLE_LOGO_PATH =
  'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z';

const PHONE_ICON_PATH =
  'M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z';

const AsteriskIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="-4 -4 32 32" width={size} height={size}>
    <Path d="M23.5 10.5a1 1 0 0 0 -1 -1h-5.74a0.23 0.23 0 0 1 -0.21 -0.13 0.23 0.23 0 0 1 0 -0.25l2.86 -5a1 1 0 0 0 -0.36 -1.36l-2.6 -1.5a1 1 0 0 0 -1.37 0.36l-2.86 5a0.25 0.25 0 0 1 -0.44 0l-2.86 -5a1 1 0 0 0 -1.37 -0.36L5 2.79a1 1 0 0 0 -0.36 1.36l2.86 5a0.23 0.23 0 0 1 0 0.25 0.23 0.23 0 0 1 -0.21 0.13H1.5a1 1 0 0 0 -1 1v3a1 1 0 0 0 1 1h5.74a0.24 0.24 0 0 1 0.21 0.12 0.23 0.23 0 0 1 0 0.25l-2.86 5A1 1 0 0 0 5 21.21l2.6 1.5a1 1 0 0 0 1.37 -0.37l2.86 -5a0.26 0.26 0 0 1 0.44 0l2.86 5a1 1 0 0 0 1.37 0.37l2.6 -1.5a1 1 0 0 0 0.36 -1.37l-2.86 -5a0.23 0.23 0 0 1 0 -0.25 0.24 0.24 0 0 1 0.21 -0.12h5.69a1 1 0 0 0 1 -1Z" fill={color} />
  </Svg>
);

function GetStartedScreen() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { handleLogin } = useAuth();
  const onSuccess = async (email: string) => {
    setModalVisible(false);
    setShowBackButton(false);
    await transitionRef.current?.animateOut('left');
    handleLogin(email);
  };
  const onSignIn = async () => {
    await transitionRef.current?.animateOut('left');
    navigation.navigate('SignIn');
  };
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const isPhoneInput = !email.includes('@') && /^\+?[\d\s\-()]{10,}$/.test(email.replace(/\s/g, ''));
  const [loading, setLoading] = useState(false);
  const [showBackButton, setShowBackButton] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const changeStep = useCallback(async (
    newStep: 'form' | 'code',
    direction: TransitionDirection = 'left',
  ) => {
    await transitionRef.current?.animateOut(direction);
    const inDir: TransitionDirection = direction === 'left' ? 'right' : direction === 'right' ? 'left' : direction === 'up' ? 'down' : 'up';
    await new Promise<void>((resolve) => {
      setStep(newStep);
      requestAnimationFrame(() => resolve());
    });
    await transitionRef.current?.animateIn(inDir);
  }, []);

  const onBackToLanding = async () => {
    setShowBackButton(false);
    await transitionRef.current?.animateOut('right');
    navigation.goBack();
  };

  const handleBack = useCallback(() => {
    if (step === 'form') {
      onBackToLanding();
    } else {
      changeStep('form', 'down');
    }
  }, [step, changeStep, onBackToLanding]);

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  async function handleSignUp() {
    if (!email.includes('@') && !isPhoneInput) {
      showModal('Invalid Email or Phone', 'Please enter a valid email address or phone number');
      return;
    }

    if (password.length < 6) {
      showModal('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        changeStep('code', 'up');
      } else {
        showModal('Error', data.error || 'Failed to send code');
      }
    } catch (error) {
      showModal('Connection Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      showModal('Invalid Code', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/verify-and-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store JWT token for authenticated API requests
        if (data.token) {
          await setAuthToken(data.token);
        }
        await AsyncStorage.setItem('user_email', email);
        onSuccess(email);
      } else {
        showModal('Error', data.error || 'Failed to create account');
      }
    } catch (error) {
      showModal('Connection Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showModal('Code Sent', `New verification code sent to ${email}`);
      }
    } catch (error) {
      showModal('Error', 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  }

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back Button */}
      {showBackButton && (
        <View className="absolute top-12 left-0 z-10">
          <BackButton onPress={handleBack} />
        </View>
      )}


      <ScreenTransition ref={transitionRef}>
      <KeyboardAvoidingView
        enabled={false}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: '20%' }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-12">
            {step === 'form' ? (
              <>
                {/* Title */}
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                  Create Your Account
                </Text>

                {/* Email Input */}
                <View className="mt-3">
                  <Text style={{ color: colors.text, marginBottom: s(6), marginLeft: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Email
                  </Text>
                  <View style={{ backgroundColor: emailFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: emailFocused ? colors.cardDark : colors.border, paddingLeft: s(12), ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="default"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      style={{ flex: 1, color: colors.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.extraSmall} ${fontFamily.regular}`}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View className="mt-4 mb-6">
                  <Text style={{ color: colors.text, marginBottom: s(6), marginLeft: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Password
                  </Text>
                  <View style={{ backgroundColor: passwordFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: passwordFocused ? colors.cardDark : colors.border, paddingRight: 0, paddingLeft: s(12), ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      style={{ flex: 1, color: colors.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.extraSmall} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <OpenEyeIcon size={s(iconSize.headerNav)} color="#FFFFFF" /> : <CloseEyesIcon size={s(iconSize.headerNav)} color="#FFFFFF" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                  {/* Hidden Forgot Password placeholder for layout consistency */}
                  <View
                    style={{ alignSelf: 'flex-end', marginTop: s(8), opacity: 0 }}
                    pointerEvents="none"
                  >
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                      Trouble logging in?
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Verification Code Step */}
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-4`}>
                  {isPhoneInput ? 'Verify Your Number' : 'Verify Your Email'}
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-8`}>
                  {isPhoneInput ? 'Enter the 6-digit code sent via SMS to' : 'Enter the 6-digit code sent to'}{'\n'}
                  <Text style={{ color: colors.text }}>{email}</Text>
                </Text>

                {/* Code Input */}
                <View className="mb-8">
                  <OTPInput
                    value={code}
                    onChange={setCode}
                    length={6}
                    disabled={loading}
                    autoFocus
                  />
                </View>

                {/* Resend Code */}
                <TouchableOpacity
                  onPress={() => handleResendCode()}
                  disabled={loading}
                  className="items-center mb-4"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Action Button - Sign Up (muted) / Verify */}
            <TouchableOpacity
              onPress={() => { step === 'form' ? handleSignUp() : handleVerifyCode(); }}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card, position: 'relative' }}
              className={`${radius.full} ${pill} items-center justify-center mb-2`}
            >
              <Text style={{ color: colors.bg, opacity: loading ? 0 : 1 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {step === 'form' ? 'Sign Up' : 'Verify'}
              </Text>
              {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <LottieView
                    source={require('../frontassets/Loading.json')}
                    autoPlay
                    loop
                    speed={1.75}
                    style={{ width: s(100), height: s(44) }}
                    colorFilters={[
                      { keypath: '**.Fill 1', color: colors.bg },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Or divider - only show on form step */}
            {step === 'form' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s(4), marginBottom: s(10) }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                <Text style={{ color: colors.textMuted, marginHorizontal: s(12) }} className={`${textSize.small} ${fontFamily.regular}`}>
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
              </View>
            )}

            {/* Google Sign In - only show on form step */}
            {step === 'form' && (
              <View>
                <GoogleSignInBtn
                  onSuccess={onSuccess}
                  onError={(error) => showModal('Google Sign-In Error', error)}
                  disabled={loading}
                />
              </View>
            )}

            {/* Apple Sign In - only show on form step */}
            {step === 'form' && (
              <View className="mt-3">
                <Pressable
                  onPress={() => {
                    if (haptics.landingTap.enabled) {
                      triggerHaptic(haptics.landingTap.type);
                    }
                    showModal('Coming Soon', 'Apple Sign-In is coming soon.');
                  }}
                  disabled={loading}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9999,
                    overflow: 'hidden',
                    ...shadow.card,
                  }}
                  className="px-5 h-10 items-center justify-center"
                >
                  <View className="flex-row items-center justify-center">
                    <View className="mr-3">
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.text}>
                        <Path d={APPLE_LOGO_PATH} />
                      </Svg>
                    </View>
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      Continue with Apple
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* SMS Sign In - only show on form step */}
            {step === 'form' && (
              <View className="mt-3">
                <Pressable
                  onPress={async () => {
                    if (haptics.landingTap.enabled) {
                      triggerHaptic(haptics.landingTap.type);
                    }
                    await transitionRef.current?.animateOut('up');
                    navigation.navigate('SMSSignIn');
                  }}
                  disabled={loading}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9999,
                    overflow: 'hidden',
                    ...shadow.card,
                  }}
                  className="px-5 h-10 items-center justify-center"
                >
                  <View className="flex-row items-center justify-center">
                    <Text style={{ fontSize: 20, marginRight: s(10) }}>🇺🇸</Text>
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      Continue with SMS
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Already have an account */}
            {step === 'form' && (
              <TouchableOpacity
                onPress={() => onSignIn()}
                activeOpacity={0.7}
                className="items-center py-2 mt-4"
              >
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                  Already have an account?{' '}
                  <Text style={{ color: colors.text, textDecorationLine: 'underline' }} className={`${fontFamily.semibold}`}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      </ScreenTransition>

      {/* Info Modal */}
      <InfoModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
      </SafeAreaView>
  );
}

export default memo(GetStartedScreen);
