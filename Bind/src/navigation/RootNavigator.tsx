import React, { useEffect } from 'react';
import { View } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import TermsAcceptScreen from '../screens/TermsAcceptScreen';
import PermissionsChecklistScreen from '../screens/PermissionsChecklistScreen';
import MembershipScreen from '../screens/MembershipScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingLoadingScreen from '../screens/OnboardingLoadingScreen';
import MainTabNavigator from './MainTabNavigator';
import { PresetSaveProvider } from './PresetsStack';
import type { MainStackParamList } from './types';

const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainNavigator({ fromOnboarding }: { fromOnboarding?: boolean }) {
  return (
    <PresetSaveProvider>
      <MainStack.Navigator
        initialRouteName={fromOnboarding ? 'OnboardingLoading' : 'MainTabs'}
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <MainStack.Screen name="OnboardingLoading" component={OnboardingLoadingScreen} />
        <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
      </MainStack.Navigator>
    </PresetSaveProvider>
  );
}

export default function RootNavigator() {
  const { authState, isInitializing, onboardingChoice } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isInitializing) {
      BootSplash.hide({ fade: true });
    }
  }, [isInitializing]);

  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  switch (authState) {
    case 'auth':
      return <AuthStack />;
    case 'terms':
      return <TermsAcceptScreen />;
    case 'permissions':
      return <PermissionsChecklistScreen />;
    case 'onboarding':
      return <OnboardingScreen />;
    case 'membership':
      return <MembershipScreen />;
    case 'main':
      return <MainNavigator fromOnboarding={onboardingChoice != null} />;
    default:
      return <AuthStack />;
  }
}
