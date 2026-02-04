import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Preset } from '../components/PresetCard';

// Auth flow screens
export type AuthStackParamList = {
  Landing: undefined;
  GetStarted: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
};

// Post-auth onboarding screens (no back gestures)
export type OnboardingStackParamList = {
  Terms: undefined;
  Permissions: undefined;
  Membership: undefined;
};

// Presets tab (only PresetsMain now)
export type PresetsStackParamList = {
  PresetsMain: undefined;
};

// Main tab navigator
export type MainTabParamList = {
  Home: undefined;
  Presets: NavigatorScreenParams<PresetsStackParamList>;
  Stats: undefined;
  Settings: undefined;
  EditPresetApps: undefined;
  PresetSettings: undefined;
};

// Main stack wraps tabs
export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

// Root navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: { screen: keyof OnboardingStackParamList };
  Main: NavigatorScreenParams<MainStackParamList>;
};
