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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import BackButton from '../components/BackButton';
import InfoModal from '../components/InfoModal';
import OTPInput from '../components/OTPInput';
import { useTheme, textSize, fontFamily, radius, shadow, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef, TransitionDirection } from '../components/ScreenTransition';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

function SMSSignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const transitionRef = useRef<ScreenTransitionRef>(null);
  const { handleLogin } = useAuth();
  const onBack = async () => {
    await transitionRef.current?.animateOut('down');
    navigation.goBack();
  };
  const onSuccess = async (phone: string) => {
    setModalVisible(false);
    await transitionRef.current?.animateOut('left');
    handleLogin(phone);
  };
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);

  const changeStep = useCallback(async (
    newStep: 'phone' | 'code',
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
    if (step === 'phone') {
      onBack();
    } else {
      changeStep('phone', 'down');
    }
  }, [step, onBack, changeStep]);

  function showModal(title: string, message: string) {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }

  async function handleSendCode() {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      showModal('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = phone.startsWith('+') ? phone : `+1${cleaned}`;
      const response = await fetch(`${API_URL}/api/sms-send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        changeStep('code', 'up');
      } else {
        showModal('Error', data.error || 'Failed to send code');
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
      const cleaned = phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('+') ? phone : `+1${cleaned}`;
      const response = await fetch(`${API_URL}/api/sms-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          await setAuthToken(data.token);
        }
        await AsyncStorage.setItem('user_email', fullPhone);
        onSuccess(fullPhone);
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
      const cleaned = phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('+') ? phone : `+1${cleaned}`;
      const response = await fetch(`${API_URL}/api/sms-send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      if (response.ok) {
        showModal('Code Sent', `New verification code sent to ${fullPhone}`);
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
              {step === 'phone' ? (
                <>
                  <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                    Continue with SMS
                  </Text>

                  <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-6`}>
                    Enter your phone number and we'll send you a verification code.
                  </Text>

                  <View className="mt-3 mb-6">
                    <Text style={{ color: colors.text, marginBottom: s(6), marginLeft: s(8) }} className={`${textSize.small} ${fontFamily.regular}`}>
                      Phone Number
                    </Text>
                    <View style={{ backgroundColor: phoneFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: phoneFocused ? colors.cardDark : colors.border, paddingLeft: s(12), ...shadow.card }} className={`${radius.full} ${pill} flex-row items-center`}>
                      <View style={{ marginRight: s(6) }}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path d="M19.5 0h-15A4.51 4.51 0 0 0 0 4.5v15A4.51 4.51 0 0 0 4.5 24h15a4.51 4.51 0 0 0 4.5 -4.5v-15A4.51 4.51 0 0 0 19.5 0Zm0.75 15.42a2.79 2.79 0 0 1 -2.78 2.79H8.2a2.79 2.79 0 0 1 -2.79 -2.79V9.17L3.9 7.46a1 1 0 0 1 -0.16 -1.08 1 1 0 0 1 0.91 -0.59h12.82a2.79 2.79 0 0 1 2.78 2.79Z" fill={colors.text} />
                          <Path d="M16.59 9.59H9.08a0.75 0.75 0 0 1 0 -1.5h7.51a0.75 0.75 0 0 1 0 1.5Z" fill={colors.text} />
                          <Path d="M16.59 12.75H9.08a0.75 0.75 0 1 1 0 -1.5h7.51a0.75 0.75 0 0 1 0 1.5Z" fill={colors.text} />
                          <Path d="M13.67 15.91H9.08a0.75 0.75 0 0 1 0 -1.5h4.59a0.75 0.75 0 0 1 0 1.5Z" fill={colors.text} />
                        </Svg>
                      </View>
                      <Text style={{ color: colors.text, marginRight: s(4) }} className={`${textSize.small} ${fontFamily.regular}`}>+1</Text>
                      <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="(555) 555-5555"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                        onFocus={() => setPhoneFocused(true)}
                        onBlur={() => setPhoneFocused(false)}
                        style={{ flex: 1, color: colors.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                        className={`${textSize.extraSmall} ${fontFamily.regular}`}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center mb-2`}>
                    Verify Your Number
                  </Text>

                  <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-8`}>
                    Enter the 6-digit code sent via SMS to{'\n'}
                    <Text style={{ color: colors.text }}>+1 {phone}</Text>
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

              {/* Action Button */}
              <TouchableOpacity
                onPress={() => { step === 'phone' ? handleSendCode() : handleVerifyCode(); }}
                disabled={loading}
                activeOpacity={0.8}
                style={{ backgroundColor: colors.text, borderWidth: 1, borderColor: colors.border, ...shadow.card, position: 'relative' }}
                className={`${radius.full} ${pill} items-center justify-center mb-2`}
              >
                <Text style={{ color: colors.bg, opacity: loading ? 0 : 1 }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {step === 'phone' ? 'Send Code' : 'Verify'}
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

export default memo(SMSSignInScreen);
