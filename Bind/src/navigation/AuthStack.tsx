import { createStackNavigator } from '@react-navigation/stack';

import LandingScreen from '../screens/LandingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { colors } from '../context/ThemeContext';
import type { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

const fadeUp = ({ current, layouts }: any) => ({
  cardStyle: {
    opacity: current.progress,
    transform: [{
      translateY: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.height * 0.04, 0],
      }),
    }],
  },
});

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: fadeUp,
        transitionSpec: {
          open: { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.8, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
          close: { animation: 'spring', config: { stiffness: 300, damping: 32, mass: 0.8, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
        },
        cardStyle: { backgroundColor: colors.bg },
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
