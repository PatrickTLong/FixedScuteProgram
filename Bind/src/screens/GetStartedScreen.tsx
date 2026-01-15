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
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import { useTheme } from '../context/ThemeContext';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';

interface Props {
  onBack: () => void;
  onSuccess: (email: string) => void;
  onSignIn: () => void;
}

function GetStartedScreen({ onBack, onSuccess, onSignIn }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  async function handleSignUp() {
    if (!email.includes('@')) {
      showModal('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      showModal('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      showModal('Passwords Don\'t Match', 'Please make sure both passwords match');
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
        showModal('Code Sent', `Verification code sent to ${email}`);
        setStep('code');
      } else {
        showModal('Error', data.error || 'Failed to send code');
      }
    } catch (error) {
      showModal('Connection Error', 'Could not connect to server.');
      console.error('Send code error:', error);
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
        showModal('Success!', 'Your account has been created');
        // Delay navigation to allow user to see success message
        setTimeout(() => onSuccess(email), 1500);
      } else {
        showModal('Error', data.error || 'Failed to create account');
      }
    } catch (error) {
      showModal('Connection Error', 'Could not connect to server');
      console.error('Create account error:', error);
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
      {/* Loading Overlay */}
      {loading && (
        <View style={{ backgroundColor: colors.bg }} className="absolute inset-0 z-50 items-center justify-center">
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      )}

      {/* Back Button */}
      <View className="absolute top-12 left-0 z-10">
        <BackButton onPress={step === 'form' ? onBack : () => setStep('form')} />
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={step === 'form' ? 1 : 2} totalSteps={2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1"
        >
          <View className="flex-1 px-6 pt-12">
            {step === 'form' ? (
              <>
                {/* Title */}
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-10">
                  Create Your Account
                </Text>

                {/* Email Input */}
                <View className="mb-4">
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

                {/* Password Input */}
                <View className="mb-4">
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
                    className="border rounded-full px-5 py-4 text-base font-nunito"
                  />
                </View>

                {/* Confirm Password Input */}
                <View className="mb-8">
                  <TextInput
                    placeholder="Confirm Password"
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
            ) : (
              <>
                {/* Verification Code Step */}
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  Verify Your Email
                </Text>

                <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito mb-8">
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
                  onPress={handleResendCode}
                  disabled={loading}
                  className="items-center mb-4"
                >
                  <Text style={{ color: colors.green }} className="text-base font-nunito">
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8">
            {/* Sign Up / Verify Button */}
            <TouchableOpacity
              onPress={step === 'form' ? handleSignUp : handleVerifyCode}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: loading ? colors.textMuted : colors.text }}
              className="rounded-full py-4 items-center mb-4"
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className="text-lg font-nunito-semibold">
                {loading ? 'Please wait...' : step === 'form' ? 'Sign Up' : 'Verify'}
              </Text>
            </TouchableOpacity>

            {/* Already have an account */}
            {step === 'form' && (
              <TouchableOpacity
                onPress={onSignIn}
                activeOpacity={0.7}
                className="items-center py-2"
              >
                <Text style={{ color: colors.textSecondary }} className="text-base font-nunito">
                  Already have an account?{' '}
                  <Text style={{ color: colors.text }} className="font-nunito-semibold">Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}

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

export default memo(GetStartedScreen);
