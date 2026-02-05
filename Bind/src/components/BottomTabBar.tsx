import React, { memo, useCallback, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { lightTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import type { BottomTabBarProps as RNBottomTabBarProps } from '@react-navigation/bottom-tabs';

type TabName = 'home' | 'presets' | 'stats' | 'settings';

interface TabItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  renderIcon: (color: string) => React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PresetsIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 9h18M9 21V9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StatsIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 20V10M12 20V4M6 20v-6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FLASH_SIZE = 80;

const TabItem = memo(({ label, isActive, onPress, renderIcon, activeColor, inactiveColor }: TabItemProps) => {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  const triggerFlash = useCallback(() => {
    lightTap();
    setPressed(true);
    flashOpacity.setValue(0.3);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setPressed(false));
  }, [flashOpacity]);

  const displayColor = pressed ? '#ffffff' : (isActive ? activeColor : inactiveColor);

  return (
    <TouchableOpacity
      onPressIn={triggerFlash}
      onPress={onPress}
      activeOpacity={0.7}
      style={{ paddingVertical: buttonPadding.tabItem }}
      className="flex-1 items-center justify-center"
    >
      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.flash,
            { opacity: flashOpacity },
          ]}
        />
        {renderIcon(displayColor)}
        <Text
          style={{ color: displayColor }}
          className={`${textSize.extraSmall} mt-1 ${fontFamily.regular}`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    width: FLASH_SIZE,
    height: FLASH_SIZE,
    borderRadius: FLASH_SIZE / 2,
    backgroundColor: '#ffffff',
  },
});

// Route names for hidden preset editing tabs
const HIDDEN_ROUTES = ['EditPresetApps', 'PresetSettings'];

function BottomTabBar({ state, navigation }: RNBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { s } = useResponsive();

  const currentRouteName = state.routes[state.index]?.name || 'Home';

  // Map current route to which visible tab is active
  const activeTab: TabName = (currentRouteName.toLowerCase() as TabName) || 'home';

  const handleTabPress = useCallback((tab: TabName) => {
    const routeNameMap: Record<TabName, string> = {
      home: 'Home',
      presets: 'Presets',
      stats: 'Stats',
      settings: 'Settings',
    };
    const routeName = routeNameMap[tab];
    if (routeName) {
      navigation.navigate(routeName);
    }
  }, [navigation]);

  const handleHomePress = useCallback(() => handleTabPress('home'), [handleTabPress]);
  const handlePresetsPress = useCallback(() => handleTabPress('presets'), [handleTabPress]);
  const handleStatsPress = useCallback(() => handleTabPress('stats'), [handleTabPress]);
  const handleSettingsPress = useCallback(() => handleTabPress('settings'), [handleTabPress]);

  const bottomPadding = Math.max(insets.bottom, s(24));

  // Hide tab bar on preset editing screens (after all hooks)
  if (HIDDEN_ROUTES.includes(currentRouteName)) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: bottomPadding,
        borderTopWidth: 1, borderTopColor: colors.border,
        ...shadow.tabBar,
      }}
    >
      <View style={{ overflow: 'hidden' }} className="flex-row pt-2">
        <TabItem
          label="Home"
          isActive={activeTab === 'home'}
          onPress={handleHomePress}
          renderIcon={(color) => <HomeIcon color={color} />}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Presets"
          isActive={activeTab === 'presets'}
          onPress={handlePresetsPress}
          renderIcon={(color) => <PresetsIcon color={color} />}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Stats"
          isActive={activeTab === 'stats'}
          onPress={handleStatsPress}
          renderIcon={(color) => <StatsIcon color={color} />}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Settings"
          isActive={activeTab === 'settings'}
          onPress={handleSettingsPress}
          renderIcon={(color) => <SettingsIcon color={color} />}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
      </View>
    </View>
  );
}

export default memo(BottomTabBar);
