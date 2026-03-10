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
import { EyeIcon, EyeClosedIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import ProgressBar from '../components/ProgressBar';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import GoogleSignInBtn from '../components/GoogleSignInButton';
import HeaderIconButton from '../components/HeaderIconButton';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef, TransitionDirection } from '../components/ScreenTransition';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../navigation/types';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';

const SendEmailIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size}>
    <Path d="M23.82 1.12a0.5 0.5 0 0 0 -0.51 -0.12l-23 9.5A0.5 0.5 0 0 0 0 11a0.51 0.51 0 0 0 0.32 0.46l6.33 2.45a0.52 0.52 0 0 0 0.47 -0.05l8.4 -6a0.5 0.5 0 0 1 0.64 0.77l-7 6.75a0.51 0.51 0 0 0 -0.15 0.36v6.76a0.49 0.49 0 0 0 0.37 0.48 0.49 0.49 0 0 0 0.56 -0.23l3.17 -5.42a0.25 0.25 0 0 1 0.33 -0.1l5.83 3.21a0.5 0.5 0 0 0 0.73 -0.33l4 -18.5a0.5 0.5 0 0 0 -0.18 -0.49Z" fill={color} />
  </Svg>
);

const LoginKeyIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <Path d="M5.8 6.347v2.606h-0.55C4.036 8.953 3 9.99 3 11.203v10.5c0 1.214 1.036 2.25 2.25 2.25h13.5c1.214 0 2.25-1.036 2.25-2.25v-10.5c0-1.214-1.036-2.25-2.25-2.25h-0.55V6.347c0-3.44-2.835-6.3-6.2-6.3s-6.2 2.86-6.2 6.3Zm6.2-4.3c-2.235 0-4.2 1.94-4.2 4.3v2.606h8.4V6.347c0-2.36-1.965-4.3-4.2-4.3ZM9.5 14.453a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Zm8 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Zm-7.051 3.684a1 1 0 0 0-1.898 0.632c0.526 1.577 2.134 2.197 3.449 2.197s2.923-0.62 3.449-2.197a1 1 0 0 0-1.898-0.632c-0.146 0.44-0.702 0.829-1.551 0.829-0.85 0-1.405-0.39-1.551-0.83Z" fill={color} fillRule="evenodd" clipRule="evenodd" />
  </Svg>
);

function SignInScreen() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { handleLogin } = useAuth();
  const onBack = async () => {
    await transitionRef.current?.animateOut('right');
    navigation.goBack();
  };
  const onSuccess = async (email: string) => {
    setModalVisible(false);
    setShowBackButton(false);
    await transitionRef.current?.animateOut('left');
    handleLogin(email);
  };
  const onForgotPassword = async () => {
    await transitionRef.current?.animateOut('up');
    navigation.navigate('ForgotPassword');
  };
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [loading, setLoading] = useState(false);
  const [showBackButton, setShowBackButton] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const changeStep = useCallback(async (
    newStep: 'credentials' | 'code',
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

  const handleBack = useCallback(() => {
    if (step === 'credentials') {
      onBack();
    } else {
      changeStep('credentials', 'down');
    }
  }, [step, onBack, changeStep]);

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  async function handleSignIn() {
    if (!email.includes('@')) {
      showModal('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      showModal('Password Required', 'Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        changeStep('code', 'up');
      } else {
        if (response.status === 404) {
          showModal('Account Not Found', 'No account exists with this email.');
        } else if (response.status === 401) {
          showModal('Incorrect Password', 'Please check your password and try again.');
        } else {
          showModal('Error', data.error || 'Failed to sign in');
        }
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
      const response = await fetch(`${API_URL}/api/verify-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
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
        showModal('Verification Failed', data.error || 'Invalid code');
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
      const response = await fetch(`${API_URL}/api/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LottieView
          source={require('../frontassets/Orange colour loading.json')}
          autoPlay
          loop
          resizeMode="contain"
          style={{ width: s(120), height: s(120) }}
        />
      </View>
    );
  }

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back Button */}
      {showBackButton && (
        <View className="absolute top-12 left-0 z-10">
          <BackButton onPress={handleBack} />
        </View>
      )}

      {/* Progress Dots */}
      {showBackButton && (
        <ProgressBar currentStep={step === 'credentials' ? 2 : 3} totalSteps={3} />
      )}

      <ScreenTransition ref={transitionRef}>
      <KeyboardAvoidingView
        enabled={false}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: '25%' }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-12">
            {step === 'credentials' ? (
              <>
                {/* Title */}
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-10`}>
                  Welcome Back
                </Text>

                {/* Email Input */}
                <View className="mb-4 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Email
                  </Text>
                  <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <SendEmailIcon size={s(iconSize.md)} color={colors.textSecondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View className="mb-8 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Password
                  </Text>
                  <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingRight: 0, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <LoginKeyIcon size={s(iconSize.md)} color={colors.textSecondary} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" /> : <EyeClosedIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                  {/* Forgot Password */}
                  <TouchableOpacity
                    onPress={() => onForgotPassword()}
                    activeOpacity={0.7}
                    style={{ alignSelf: 'flex-end', marginTop: s(8) }}
                  >
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Verification Code Step */}
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-4`}>
                  Verify Your Identity
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-8`}>
                  Enter the 6-digit code sent to{'\n'}
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

            {/* Action Button */}
            <View className="mt-2" />
            <Pressable
              onPress={() => { step === 'credentials' ? handleSignIn() : handleVerifyCode(); }}
              disabled={loading}
              android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, foreground: true, radius: -1 }}
              style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', ...shadow.card, position: 'relative' }}
              className={`${pill} items-center justify-center mb-4`}
            >
              <Text style={{ color: colors.bg }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {step === 'credentials' ? 'Sign In' : 'Verify'}
              </Text>
            </Pressable>

            {/* Google Sign In - only show on credentials step */}
            {step === 'credentials' && (
              <View className="mt-2">
                <GoogleSignInBtn
                  onSuccess={onSuccess}
                  onError={(error) => showModal('Google Sign-In Error', error)}
                  disabled={loading}
                />
              </View>
            )}

            {/* Hidden "Already have an account" placeholder for layout consistency */}
            {step === 'credentials' && (
              <View
                style={{ opacity: 0 }}
                pointerEvents="none"
                className="items-center py-2 mt-4"
              >
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                  Already have an account?{' '}
                  <Text style={{ color: colors.text }} className={`${fontFamily.semibold}`}>Sign In</Text>
                </Text>
              </View>
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

export default memo(SignInScreen);
