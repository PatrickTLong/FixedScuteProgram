import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import PresetsStack from './PresetsStack';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditPresetAppsScreen from '../screens/EditPresetAppsScreen';
import PresetSettingsScreen from '../screens/PresetSettingsScreen';
import BottomTabBar from '../components/BottomTabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Presets" component={PresetsStack} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="EditPresetApps" component={EditPresetAppsScreen} options={{ lazy: false }} />
      <Tab.Screen name="PresetSettings" component={PresetSettingsScreen} options={{ lazy: false }} />
    </Tab.Navigator>
  );
}
