import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTabNavigator from './MainTabNavigator';
import EditPresetAppsScreen from '../screens/EditPresetAppsScreen';
import PresetSettingsScreen from '../screens/PresetSettingsScreen';
import { PresetSaveProvider } from './PresetsStack';
import type { MainStackParamList } from './types';

const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainNavigator() {
  return (
    <PresetSaveProvider>
      <MainStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
        <MainStack.Screen name="EditPresetApps" component={EditPresetAppsScreen} />
        <MainStack.Screen name="PresetSettings" component={PresetSettingsScreen} />
      </MainStack.Navigator>
    </PresetSaveProvider>
  );
}

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
      return <OnboardingStack key="terms" initialScreen="Terms" />;
    case 'permissions':
      return <OnboardingStack key="permissions" initialScreen="Permissions" />;
    case 'membership':
      return <OnboardingStack key="membership" initialScreen="Membership" />;
    case 'main':
      return <MainNavigator />;
    default:
      return <AuthStack />;
  }
}
