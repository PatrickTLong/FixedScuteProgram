import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import LandingScreen from '../screens/LandingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { colors } from '../context/ThemeContext';
import type { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();


export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forScaleFromCenterAndroid,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 200 } },
          close: { animation: 'timing', config: { duration: 200 } },
        },
        cardStyle: { backgroundColor: colors.bg },
        detachPreviousScreen: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
