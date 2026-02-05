import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TermsAcceptScreen from '../screens/TermsAcceptScreen';
import PermissionsChecklistScreen from '../screens/PermissionsChecklistScreen';
import MembershipScreen from '../screens/MembershipScreen';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface Props {
  initialScreen: keyof OnboardingStackParamList;
}

export default function OnboardingStack({ initialScreen }: Props) {
  console.log('[ONBOARDING] OnboardingStack mounted/rendered with initialScreen=', initialScreen);
  return (
    <Stack.Navigator
      initialRouteName={initialScreen}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Terms" component={TermsAcceptScreen} />
      <Stack.Screen name="Permissions" component={PermissionsChecklistScreen} />
      <Stack.Screen name="Membership" component={MembershipScreen} />
    </Stack.Navigator>
  );
}
