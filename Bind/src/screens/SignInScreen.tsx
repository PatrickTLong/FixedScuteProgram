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
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';

// Eye icons for password visibility
const EyeIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
  const [showPassword, setShowPassword] = useState(false);
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
          source={require('../frontassets/Loading Dots Blue.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: 250, height: 250 }}
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
      <ProgressBar currentStep={step === 'credentials' ? 2 : 3} totalSteps={3} />

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
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-10">
                  Welcome Back
                </Text>

                {/* Email Input */}
                <View className="mb-4 mt-6">
                  <Text style={{ color: colors.text, position: 'absolute', top: -22, left: 8 }} className="text-sm font-nunito">
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    style={{ backgroundColor: colors.card, color: colors.text, height: 52, paddingVertical: 16 }}
                    className="rounded-full px-5 text-sm font-nunito"
                  />
                </View>

                {/* Password Input */}
                <View className="mb-8 mt-6">
                  <Text style={{ color: colors.text, position: 'absolute', top: -22, left: 8 }} className="text-sm font-nunito">
                    Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      style={{ backgroundColor: colors.card, color: colors.text, paddingRight: 50, height: 52, paddingVertical: 16 }}
                      className="rounded-full px-5 text-sm font-nunito"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
                    >
                      {showPassword ? <EyeIcon color={colors.text} /> : <EyeOffIcon color={colors.text} />}
                    </TouchableOpacity>

                    {/* Forgot Password - absolutely positioned */}
                    <TouchableOpacity
                      onPress={() => { lightTap(); onForgotPassword(); }}
                      activeOpacity={0.7}
                      style={{ position: 'absolute', right: 0, top: 60 }}
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Verification Code Step */}
                <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-4">
                  Verify Your Identity
                </Text>

                <Text style={{ color: colors.textSecondary }} className="text-center text-sm font-nunito mb-8">
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
                  <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito">
                    Resend code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8 mt-12">
            {/* Sign In / Verify Button */}
            <TouchableOpacity
              onPress={() => { lightTap(); step === 'credentials' ? handleSignIn() : handleVerifyCode(); }}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: loading ? colors.textMuted : colors.text }}
              className="rounded-full py-4 items-center mb-4"
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className="text-sm font-nunito-semibold">
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
