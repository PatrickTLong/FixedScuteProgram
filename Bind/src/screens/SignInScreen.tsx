import { useState, useRef, useCallback, memo } from 'react';
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
import { EyeIcon } from 'phosphor-react-native';
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

const CloseEyesIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <Path d="m2.11546 6.99524 0.00026 0.00051c0.00016 0.00033 0.00033 0.00068 -0.89373 0.44771l0.89406 -0.44703 -0.00033 -0.00068 0.00417 0.00811c0.00456 0.00882 0.0124 0.02382 0.02352 0.04459 0.02226 0.04155 0.05765 0.10613 0.10626 0.19044 0.09729 0.16876 0.24709 0.41577 0.45011 0.71496 0.40708 0.59991 1.02224 1.40085 1.84979 2.19985C6.20479 11.7519 8.66351 13.3026 12 13.3026c3.3365 0 5.7952 -1.5507 7.4504 -3.1489 0.8276 -0.799 1.4427 -1.59994 1.8498 -2.19985 0.2031 -0.29919 0.3528 -0.5462 0.4501 -0.71496 0.0487 -0.08431 0.084 -0.14889 0.1063 -0.19044 0.0111 -0.02077 0.019 -0.03577 0.0235 -0.04459l0.0039 -0.00743 0.0003 -0.00068c0.2472 -0.49348 0.8475 -0.69342 1.3413 -0.44654 0.494 0.24699 0.6942 0.84766 0.4472 1.34164l-0.8944 -0.44721c0.8944 0.44721 0.8942 0.44761 0.894 0.44804l-0.0005 0.00099 -0.0012 0.00244 -0.0035 0.00677 -0.0107 0.02089c-0.0088 0.01714 -0.0212 0.04066 -0.0369 0.07012 -0.0316 0.05892 -0.0771 0.1417 -0.1366 0.24494 -0.119 0.20634 -0.2945 0.49519 -0.5278 0.83902 -0.2785 0.41045 -0.6415 0.90235 -1.0912 1.42735l1.6215 1.6215c0.3905 0.3905 0.3905 1.0237 0 1.4142 -0.3905 0.3905 -1.0237 0.3905 -1.4142 0l-1.6018 -1.6018c-1.0032 0.9056 -2.2604 1.7931 -3.7774 2.4291l0.8984 1.7277c0.2548 0.49 0.0642 1.0938 -0.4258 1.3486 -0.49 0.2548 -1.0938 0.0641 -1.3486 -0.4259l-1.0539 -2.0266c-0.8559 0.1982 -1.7764 0.3116 -2.7622 0.3116 -0.9798 0 -1.895 -0.112 -2.74646 -0.308l-0.95733 1.9944c-0.23899 0.4979 -0.83636 0.7078 -1.33425 0.4688 -0.4979 -0.239 -0.70779 -0.8363 -0.4688 -1.3342l0.83835 -1.7466c-1.52756 -0.6366 -2.79258 -1.5286 -3.80099 -2.4389l-1.60179 1.6018c-0.39053 0.3905 -1.023694 0.3905 -1.414218 0 -0.390524 -0.3905 -0.390524 -1.0237 0 -1.4142l1.621468 -1.6215c-0.4497 -0.525 -0.81263 -1.0169 -1.09115 -1.42735 -0.233317 -0.34383 -0.408861 -0.63268 -0.527825 -0.83902 -0.059519 -0.10324 -0.104989 -0.18602 -0.136552 -0.24494 -0.015785 -0.02946 -0.028102 -0.05298 -0.03697 -0.07012l-0.01072 -0.02089 -0.003426 -0.00677 -0.001231 -0.00244 -0.000495 -0.00099c-0.000214 -0.00043 -0.000414 -0.00083 0.894009 -0.44804l-0.894423 0.44721C0.0802076 7.39687 0.280432 6.7962 0.774411 6.54921c0.493579 -0.24679 1.093689 -0.04708 1.341049 0.44603Zm0 0 -0.00029 -0.00058c-0.00009 -0.00017 0.00002 0.00006 0.00034 0.00068l-0.00005 -0.0001Z" fill={color} fillRule="evenodd" clipRule="evenodd" />
  </Svg>
);

const SendEmailIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 256 256" width={size} height={size}>
    <Path d="M253.66,133.66l-32,32a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L216,148.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM144,157.68a68,68,0,1,0-71.9,0c-20.65,6.76-39.23,19.39-54.17,37.17A8,8,0,0,0,24,208H192a8,8,0,0,0,6.13-13.15C183.18,177.07,164.6,164.44,144,157.68Z" fill={color} />
  </Svg>
);

const LoginKeyIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg viewBox="0 0 256 256" width={size} height={size}>
    <Path d="M198.13,194.85A8,8,0,0,1,192,208H24a8,8,0,0,1-6.12-13.15c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM255.18,154a8,8,0,0,1-6.94,4,7.92,7.92,0,0,1-4-1.07l-4.67-2.7a23.92,23.92,0,0,1-7.58,4.39V164a8,8,0,0,1-16,0v-5.38a23.92,23.92,0,0,1-7.58-4.39l-4.67,2.7a7.92,7.92,0,0,1-4,1.07,8,8,0,0,1-4-14.93l4.66-2.69a23.6,23.6,0,0,1,0-8.76l-4.66-2.69a8,8,0,1,1,8-13.86l4.67,2.7a23.92,23.92,0,0,1,7.58-4.39V108a8,8,0,0,1,16,0v5.38a23.92,23.92,0,0,1,7.58,4.39l4.67-2.7a8,8,0,1,1,8,13.86l-4.66,2.69a23.6,23.6,0,0,1,0,8.76l4.66,2.69A8,8,0,0,1,255.18,154ZM224,144a8,8,0,1,0-8-8A8,8,0,0,0,224,144Z" fill={color} />
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
  const isPhoneInput = !email.includes('@') && /^\+?[\d\s\-()]{10,}$/.test(email.replace(/\s/g, ''));
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
    if (!email.includes('@') && !isPhoneInput) {
      showModal('Invalid Email or Phone', 'Please enter a valid email address or phone number');
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

                {/* Email or Phone Input */}
                <View className="mb-4 mt-8">
                  <Text style={{ color: colors.text, position: 'absolute', top: s(-30), left: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                    Email or Phone
                  </Text>
                  <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                    <SendEmailIcon size={s(iconSize.md)} color={colors.textSecondary} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email or phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="default"
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
                        {showPassword ? <EyeIcon size={s(iconSize.headerNav)} color="#FFFFFF" weight="fill" /> : <CloseEyesIcon size={s(iconSize.headerNav)} color={colors.textSecondary} />}
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
                  {isPhoneInput ? 'Enter the 6-digit code sent via SMS to' : 'Enter the 6-digit code sent to'}{'\n'}
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
              <Text style={{ color: colors.bg, opacity: loading ? 0 : 1 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {step === 'credentials' ? 'Sign In' : 'Verify'}
              </Text>
              {loading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <LottieView
                    source={require('../frontassets/loading dots - Three Gray..json')}
                    autoPlay
                    loop
                    speed={1.75}
                    style={{ width: s(42), height: s(18) }}
                    colorFilters={[
                      { keypath: 'Left.Elipse 1.Preenchimento 1', color: colors.bg },
                      { keypath: 'Mid.Elipse 1.Preenchimento 1', color: colors.bg },
                      { keypath: 'Right.Elipse 1.Preenchimento 1', color: colors.bg },
                    ]}
                  />
                </View>
              )}
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
