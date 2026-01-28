import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/cardApi';
import { API_URL } from '../config/api';
import { lightTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onSuccess: (email: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Google "G" Logo SVG
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '193061003488-ksk4uod4qllq9avl76vjb2df172ohh2n.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function GoogleSignInBtn({ onSuccess, onError, disabled }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    lightTap();
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      // Sign out first to always show account picker
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();

      // Get the ID token
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Send the Google token to your backend for verification
      const response = await fetch(`${API_URL}/api/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: userInfo.data?.user.email,
          name: userInfo.data?.user.name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        await setAuthToken(data.token);
        await AsyncStorage.setItem('user_email', userInfo.data?.user.email || '');
        onSuccess(userInfo.data?.user.email || '');
      } else {
        throw new Error(data.error || 'Google sign-in failed');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services not available');
      } else if (error.message?.includes('getTokens') || error.message?.includes('token')) {
        // User backed out before completing sign-in, ignore silently
      } else {
        onError?.(error.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{ backgroundColor: colors.card, position: 'relative' }}
      className="rounded-full py-4 items-center justify-center"
    >
      <View style={{ opacity: loading ? 0 : 1 }} className="flex-row items-center justify-center">
        <View className="mr-3">
          <GoogleLogo size={20} />
        </View>
        <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">
          Continue with Google
        </Text>
      </View>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
          <Lottie
            source={require('../frontassets/Loading Dots Blue.json')}
            autoPlay
            loop
            speed={2}
            style={{ width: 150, height: 150 }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}
