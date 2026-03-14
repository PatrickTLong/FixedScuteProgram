import React, { useState, useRef, useCallback, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import HeaderIconButton from '../components/HeaderIconButton';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { API_URL } from '../config/api';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef, TransitionDirection } from '../components/ScreenTransition';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const onBack = async () => {
    await transitionRef.current?.animateOut('down');
    navigation.goBack();
  };
  const onSuccess = async () => {
    await transitionRef.current?.animateOut('down');
    navigation.goBack();
  };
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animated step transition helper
  const changeStep = useCallback(async (
    newStep: 'email' | 'code' | 'password',
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

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  async function handleSendCode() {
    if (!email.includes('@')) {
      showModal('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        changeStep('code', 'left');
      } else {
        if (response.status === 404) {
          showModal('Account Not Found', 'No account exists with this email.');
        } else {
          showModal('Error', data.error || 'Failed to send reset code');
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
    changeStep('password', 'left');
  }

  async function handleResetPassword() {
    if (newPassword.length < 6) {
      showModal('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal('Passwords Don\'t Match', 'Please make sure both passwords match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        showModal('Success', 'Your password has been reset. Please sign in with your new password.');
        setTimeout(() => onSuccess(), 1500);
      } else {
        showModal('Error', data.error || 'Failed to reset password');
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
      const response = await fetch(`${API_URL}/api/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showModal('Code Sent', `New reset code sent to ${email}`);
      }
    } catch (error) {
      showModal('Error', 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  }

  const handleBack = useCallback(() => {
    if (step === 'email') {
      onBack();
    } else if (step === 'code') {
      changeStep('email', 'right');
    } else {
      changeStep('code', 'right');
    }
  }, [step, onBack, changeStep]);

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back Button */}
      <View className="absolute top-12 left-0 z-10">
        <BackButton onPress={handleBack} />
      </View>


      <ScreenTransition ref={transitionRef} from="down">
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
            {step === 'email' && (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                  Reset Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-6`}>
                  Enter your email and we'll send you a code to reset your password.
                </Text>

                <View className="mt-3 mb-6">
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
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                  </View>
                </View>
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                  Enter Code
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-8`}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={{ color: colors.text }}>{email}</Text>
                </Text>

                <View className="mb-8">
                  <OTPInput
                    value={code}
                    onChange={setCode}
                    length={6}
                    disabled={loading}
                    autoFocus
                  />
                </View>

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

            {step === 'password' && (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                  New Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-6`}>
                  Create a new password for your account.
                </Text>

                <View className="mt-3">
                  <Text style={{ color: colors.text, marginBottom: s(6), marginLeft: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    New Password
                  </Text>
                  <View style={{ backgroundColor: newPasswordFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: newPasswordFocused ? colors.cardDark : colors.border, paddingRight: 0, paddingLeft: s(12), ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      onFocus={() => setNewPasswordFocused(true)}
                      onBlur={() => setNewPasswordFocused(false)}
                      style={{ flex: 1, color: colors.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <OpenEyeIcon size={s(iconSize.headerNav)} color="#FFFFFF" /> : <CloseEyesIcon size={s(iconSize.headerNav)} color="#FFFFFF" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>

                <View className="mt-4 mb-6">
                  <Text style={{ color: colors.text, marginBottom: s(6), marginLeft: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Confirm New Password
                  </Text>
                  <View style={{ backgroundColor: confirmPasswordFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: confirmPasswordFocused ? colors.cardDark : colors.border, paddingRight: 0, paddingLeft: s(12), ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      style={{ flex: 1, color: colors.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <OpenEyeIcon size={s(iconSize.headerNav)} color="#FFFFFF" /> : <CloseEyesIcon size={s(iconSize.headerNav)} color="#FFFFFF" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Action Button */}
            <TouchableOpacity
              onPress={() => {
                step === 'email'
                  ? handleSendCode()
                  : step === 'code'
                  ? handleVerifyCode()
                  : handleResetPassword();
              }}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card, position: 'relative' }}
              className={`${radius.full} ${pill} items-center justify-center mb-2`}
            >
              <Text style={{ color: colors.bg, opacity: loading ? 0 : 1 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {step === 'email'
                  ? 'Send Code'
                  : step === 'code'
                  ? 'Continue'
                  : 'Reset Password'}
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

export default memo(ForgotPasswordScreen);
