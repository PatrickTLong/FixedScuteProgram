import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import TermsAcceptScreen from '../screens/TermsAcceptScreen';
import PermissionsChecklistScreen from '../screens/PermissionsChecklistScreen';
import MembershipScreen from '../screens/MembershipScreen';
import MainTabNavigator from './MainTabNavigator';
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
      return <TermsAcceptScreen />;
    case 'permissions':
      return <PermissionsChecklistScreen />;
    case 'membership':
      return <MembershipScreen />;
    case 'main':
      return <MainNavigator />;
    default:
      return <AuthStack />;
  }
}
