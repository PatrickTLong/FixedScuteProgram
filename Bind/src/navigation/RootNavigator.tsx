import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTabNavigator from './MainTabNavigator';

export default function RootNavigator() {
  const { authState, isInitializing } = useAuth();
  const { colors } = useTheme();

  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  switch (authState) {
    case 'auth':
      return <AuthStack />;
    case 'terms':
      return <OnboardingStack initialScreen="Terms" />;
    case 'permissions':
      return <OnboardingStack initialScreen="Permissions" />;
    case 'membership':
      return <OnboardingStack initialScreen="Membership" />;
    case 'main':
      return <MainTabNavigator />;
    default:
      return <AuthStack />;
  }
}
