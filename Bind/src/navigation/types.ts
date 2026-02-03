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

// Preset edit flow
export type PresetsStackParamList = {
  PresetsMain: undefined;
  EditPresetApps: undefined;
  PresetSettings: {
    name: string;
    selectedApps: string[];
    blockedWebsites: string[];
    installedApps: Array<{ id: string; name: string; icon?: string }>;
    iosSelectedAppsCount: number;
  };
};

// Main tab navigator
export type MainTabParamList = {
  Home: undefined;
  Presets: NavigatorScreenParams<PresetsStackParamList>;
  Settings: undefined;
};

// Root navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: { screen: keyof OnboardingStackParamList };
  Main: NavigatorScreenParams<MainTabParamList>;
};
