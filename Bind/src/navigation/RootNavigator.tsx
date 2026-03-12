import React, { useEffect } from 'react';
import { View } from 'react-native';
import BootSplash from 'react-native-bootsplash';
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

function MainNavigator() {
  return (
    <PresetSaveProvider>
      <MainTabNavigator />
    </PresetSaveProvider>
  );
}

export default function RootNavigator() {
  const { authState, isInitializing } = useAuth();
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
    case 'onboarding_loading':
      return <OnboardingLoadingScreen />;
    case 'membership':
      return <MembershipScreen />;
    case 'main':
      return <MainNavigator />;
    default:
      return <AuthStack />;
  }
}
