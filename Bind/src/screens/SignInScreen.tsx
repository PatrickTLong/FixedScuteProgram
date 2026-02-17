import React, { useState, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import BoxiconsFilled from '../components/BoxiconsFilled';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ProgressBar from '../components/ProgressBar';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import GoogleSignInBtn from '../components/GoogleSignInButton';
import ScreenTransition from '../components/ScreenTransition';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';

function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { handleLogin } = useAuth();
  const onBack = () => navigation.goBack();
  const onSuccess = (email: string) => handleLogin(email);
  const onForgotPassword = () => navigation.navigate('ForgotPassword');
  const { colors } = useTheme();
  const { s } = useResponsive();
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
          speed={2.5}
          style={{ width: s(200), height: s(200) }}
        />
      </SafeAreaView>
    );
  }

  return (
    <ScreenTransition>
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
                <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-10`}>
                  Welcome Back
                </Text>

                {/* Email Input */}
                <View className="mb-4 mt-8">
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

                {/* Password Input */}
                <View className="mb-8 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-25), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
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
                      style={{ backgroundColor: colors.card, color: colors.text, paddingRight: s(50), height: s(52), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                      className={`${radius.full} px-5 ${textSize.small} ${fontFamily.regular}`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: s(16), top: 0, bottom: 0, justifyContent: 'center' }}
                    >
                      <BoxiconsFilled name={showPassword ? 'bx-eye' : 'bx-eye-slash'} size={iconSize.md} color={colors.text} />
                    </TouchableOpacity>

                    {/* Forgot Password - absolutely positioned */}
                    <TouchableOpacity
                      onPress={() => onForgotPassword()}
                      activeOpacity={0.7}
                      style={{ position: 'absolute', right: 0, top: s(60) }}
                    >
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </View>
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
          </View>

          {/* Bottom Section */}
          <View className="px-6 pb-8 mt-12">
            {/* Sign In / Verify Button */}
            <TouchableOpacity
              onPress={() => { step === 'credentials' ? handleSignIn() : handleVerifyCode(); }}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: loading ? colors.textMuted : colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`${radius.full} py-4 items-center mb-4`}
            >
              <Text style={{ color: loading ? colors.textSecondary : colors.bg }} className={`${textSize.small} ${fontFamily.semibold}`}>
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
    </ScreenTransition>
  );
}

export default memo(SignInScreen);
