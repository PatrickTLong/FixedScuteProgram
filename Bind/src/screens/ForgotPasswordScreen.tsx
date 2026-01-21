import React, { useState, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config/api';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

function ForgotPasswordScreen({ onBack, onSuccess }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const getCurrentStep = () => {
    if (step === 'email') return 1;
    if (step === 'code') return 2;
    return 3;
  };

  const handleBack = () => {
    if (step === 'email') {
      onBack();
    } else if (step === 'code') {
      setStep('email');
    } else {
      setStep('code');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Loading Overlay */}
      {loading && (
        <View style={{ backgroundColor: colors.bg }} className="absolute inset-0 z-50 items-center justify-center">
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      )}

      {/* Back Button */}
      <View className="absolute top-12 left-0 z-10">
        <BackButton onPress={handleBack} />
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={getCurrentStep()} totalSteps={3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: '20%' }}
          className="flex-1"
        >
          <View className="px-6 pt-12">
            {step === 'email' && (
              <>
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  Reset Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito mb-10">
                  Enter your email address and we'll send you a code to reset your password.
                </Text>

                <View className="mb-8">
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    className="border rounded-full px-5 py-4 text-base font-nunito"
                  />
                </View>
              </>
            )}

            {step === 'code' && (
              <>
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  Enter Code
                </Text>

                <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito mb-8">
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
                  onPress={handleResendCode}
                  disabled={loading}
                  className="items-center mb-4"
                >
                  <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito">
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'password' && (
              <>
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  New Password
                </Text>

                <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito mb-10">
                  Create a new password for your account.
                </Text>

                <View className="mb-4">
                  <TextInput
                    placeholder="New Password"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    className="border rounded-full px-5 py-4 text-base font-nunito"
                  />
                </View>

                <View className="mb-8">
                  <TextInput
                    placeholder="Confirm New Password"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    className="border rounded-full px-5 py-4 text-base font-nunito"
                  />
                </View>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8 mt-6">
            {/* Action Button */}
            <TouchableOpacity
              onPress={
                step === 'email'
                  ? handleSendCode
                  : step === 'code'
                  ? handleVerifyCode
                  : handleResetPassword
              }
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: loading ? colors.textMuted : colors.text }}
              className="rounded-full py-4 items-center mb-4"
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className="text-lg font-nunito-semibold">
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
