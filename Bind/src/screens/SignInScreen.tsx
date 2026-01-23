import React, { useState, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import GoogleSignInBtn from '../components/GoogleSignInButton';
import { useTheme } from '../context/ThemeContext';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import { lightTap } from '../utils/haptics';

interface Props {
  onBack: () => void;
  onSuccess: (email: string) => void;
  onForgotPassword: () => void;
}

function SignInScreen({ onBack, onSuccess, onForgotPassword }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

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
        showModal('Code Sent', `Verification code sent to ${email}`);
        setStep('code');
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Lottie
          source={require('../frontassets/Insider-loading.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: 150, height: 150 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Back Button */}
      <View className="absolute top-12 left-0 z-10">
        <BackButton onPress={step === 'credentials' ? onBack : () => setStep('credentials')} />
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={step === 'credentials' ? 1 : 2} totalSteps={2} />

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
            {step === 'credentials' ? (
              <>
                {/* Title */}
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-10">
                  Welcome Back
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

                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() => { lightTap(); onForgotPassword(); }}
                  activeOpacity={0.7}
                  className="items-end mb-8"
                >
                  <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Verification Code Step */}
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  Verify Your Identity
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
                  onPress={() => { lightTap(); handleResendCode(); }}
                  disabled={loading}
                  className="items-center mb-4"
                >
                  <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito">
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8 mt-6">
            {/* Sign In / Verify Button */}
            <TouchableOpacity
              onPress={() => { lightTap(); step === 'credentials' ? handleSignIn() : handleVerifyCode(); }}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: loading ? colors.textMuted : colors.text }}
              className="rounded-full py-4 items-center mb-4"
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className="text-lg font-nunito-semibold">
                {loading ? 'Please wait...' : step === 'credentials' ? 'Sign In' : 'Verify'}
              </Text>
            </TouchableOpacity>

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

export default memo(SignInScreen);
