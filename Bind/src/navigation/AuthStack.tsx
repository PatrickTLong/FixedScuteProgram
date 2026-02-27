import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '../screens/LandingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import FadeFromBottom from '../components/FadeFromBottom';
import { colors } from '../context/ThemeContext';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Stable wrapped components — each screen plays fade_from_bottom on every focus
const FadeLanding = () => <FadeFromBottom><LandingScreen /></FadeFromBottom>;
const FadeGetStarted = () => <FadeFromBottom><GetStartedScreen /></FadeFromBottom>;
const FadeSignIn = () => <FadeFromBottom><SignInScreen /></FadeFromBottom>;
const FadeForgotPassword = () => <FadeFromBottom><ForgotPasswordScreen /></FadeFromBottom>;

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Landing" component={FadeLanding} />
      <Stack.Screen name="GetStarted" component={FadeGetStarted} />
      <Stack.Screen name="SignIn" component={FadeSignIn} />
      <Stack.Screen name="ForgotPassword" component={FadeForgotPassword} />
    </Stack.Navigator>
  );
}
