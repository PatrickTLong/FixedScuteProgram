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
import LoadingSpinner from '../components/LoadingSpinner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EyeIcon, EyeClosedIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import BackButton from '../components/BackButton';
import ProgressBar from '../components/ProgressBar';
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

      {/* Progress Dots */}
      <ProgressBar currentStep={step === 'email' ? 2 : 3} totalSteps={3} />

      <ScreenTransition ref={transitionRef} from="down">
      <KeyboardAvoidingView
        enabled={false}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: s(80) }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6">
            {step === 'email' && (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-4`}>
                  Reset Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-10`}>
                  Enter your email address and we'll send you a code to reset your password.
                </Text>

                <View className="mb-8 mt-8">
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
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-4`}>
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
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-4`}>
                  New Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-10`}>
                  Create a new password for your account.
                </Text>

                <View className="mb-4 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    New Password
                  </Text>
                  <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingRight: 0, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <LoginKeyIcon size={s(iconSize.md)} color={colors.textSecondary} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" /> : <EyeClosedIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>

                <View className="mb-8 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Confirm New Password
                  </Text>
                  <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingRight: 0, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <LoginKeyIcon size={s(iconSize.md)} color={colors.textSecondary} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" /> : <EyeClosedIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" />}
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>
              </>
            )}
            {/* Action Button */}
            <View className="mt-4" />
            <Pressable
              onPress={() => {
                step === 'email'
                  ? handleSendCode()
                  : step === 'code'
                  ? handleVerifyCode()
                  : handleResetPassword();
              }}
              disabled={loading}
              android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, foreground: true, radius: -1 }}
              style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', ...shadow.card, position: 'relative' }}
              className={`${pill} items-center justify-center mb-4`}
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
                  <LoadingSpinner size={s(20)} color={colors.bg} />
                </View>
              )}
            </Pressable>
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
