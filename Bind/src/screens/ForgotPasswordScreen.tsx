import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';

// Eye icons for password visibility
const EyeIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EyeOffIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1 1l22 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { API_URL } from '../config/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const onBack = () => navigation.goBack();
  const onSuccess = () => navigation.goBack();
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
        showModal('Code Sent', `Password reset code sent to ${email}`);
        setStep('code');
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
    setStep('password');
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
      setStep('email');
    } else {
      setStep('code');
    }
  }, [step, onBack]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Lottie
          source={require('../frontassets/Loading Dots Blue.json')}
          autoPlay
          loop
          speed={2.5}
          style={{ width: s(200), height: s(200) }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back Button */}
      <View className="absolute top-12 left-0 z-10">
        <BackButton onPress={handleBack} />
      </View>

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
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-25), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.card, color: colors.text, height: s(52), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                    className={`${radius.full} px-5 ${textSize.small} ${fontFamily.regular}`}
                  />
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
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-25), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    New Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ backgroundColor: colors.card, color: colors.text, paddingRight: s(50), height: s(52), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                      className={`${radius.full} px-5 ${textSize.small} ${fontFamily.regular}`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', right: s(16), top: 0, bottom: 0, justifyContent: 'center' }}
                    >
                      {showNewPassword ? <EyeIcon color={colors.text} /> : <EyeOffIcon color={colors.text} />}
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-8 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-25), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Confirm New Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ backgroundColor: colors.card, color: colors.text, paddingRight: s(50), height: s(52), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                      className={`${radius.full} px-5 ${textSize.small} ${fontFamily.regular}`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: s(16), top: 0, bottom: 0, justifyContent: 'center' }}
                    >
                      {showConfirmPassword ? <EyeIcon color={colors.text} /> : <EyeOffIcon color={colors.text} />}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8 mt-6">
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
              style={{ backgroundColor: loading ? colors.textMuted : colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`${radius.full} py-4 items-center mb-4`}
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {loading
                  ? 'Please wait...'
                  : step === 'email'
                  ? 'Send Code'
                  : step === 'code'
                  ? 'Continue'
                  : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
