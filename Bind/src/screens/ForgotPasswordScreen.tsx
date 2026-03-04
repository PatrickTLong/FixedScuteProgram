import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { SafeAreaView } from 'react-native-safe-area-context';
import BoxiconsFilled from '../components/BoxiconsFilled';
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import HeaderIconButton from '../components/HeaderIconButton';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { API_URL } from '../config/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef, TransitionDirection } from '../components/ScreenTransition';
import type { AuthStackParamList } from '../navigation/types';

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

  const currentStep = useMemo(() => {
    if (step === 'email') return 2;
    return 3;
  }, [step]);

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
      {/* Progress Bar */}
      <ProgressBar currentStep={currentStep} totalSteps={3} />

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
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, height: s(48), borderWidth: 1, borderColor: colors.border, ...shadow.card, overflow: 'hidden', paddingHorizontal: s(20) }} className={radius.xl}>
                    <BoxiconsFilled name="bx-user-check" size={s(iconSize.headerNav)} color={colors.textSecondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8) }}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, height: s(48), borderWidth: 1, borderColor: colors.border, ...shadow.card, overflow: 'hidden', paddingLeft: s(20) }} className={radius.xl}>
                    <BoxiconsFilled name="bx-key" size={s(iconSize.headerNav)} color={colors.textSecondary} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8) }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowNewPassword(!showNewPassword)}>
                        <BoxiconsFilled name={showNewPassword ? 'bx-eye' : 'bx-eye-slash'} size={s(iconSize.headerNav)} color={colors.text} />
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>

                <View className="mb-8 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Confirm New Password
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, height: s(48), borderWidth: 1, borderColor: colors.border, ...shadow.card, overflow: 'hidden', paddingLeft: s(20) }} className={radius.xl}>
                    <BoxiconsFilled name="bx-key" size={s(iconSize.headerNav)} color={colors.textSecondary} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ flex: 1, color: colors.text, marginLeft: s(8) }}
                      className={`${textSize.small} ${fontFamily.regular}`}
                    />
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: s(8), height: '100%' }}>
                      <HeaderIconButton onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <BoxiconsFilled name={showConfirmPassword ? 'bx-eye' : 'bx-eye-slash'} size={s(iconSize.headerNav)} color={colors.text} />
                      </HeaderIconButton>
                    </View>
                  </View>
                </View>
              </>
            )}
            {/* Action Button */}
            <View className="mt-4" />
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
              className={`${radius.full} py-4 items-center mb-4`}
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
