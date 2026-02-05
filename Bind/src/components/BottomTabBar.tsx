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
  renderIcon: (color: string, filled: boolean) => React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}

const HomeIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    {filled ? (
      <>
        <Path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
        <Path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
      </>
    ) : (
      <Path
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

const PresetsIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    {filled ? (
      <>
        <Path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
        <Path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
        <Path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
        <Path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
      </>
    ) : (
      <Path
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

const StatsIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    {filled ? (
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9Z"
      />
    ) : (
      <Path
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
      stroke={color}
      strokeWidth={1.5}
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
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        {renderIcon(displayColor, isActive)}
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

  const renderHomeIcon = useCallback((color: string, filled: boolean) => <HomeIcon color={color} filled={filled} />, []);
  const renderPresetsIcon = useCallback((color: string, filled: boolean) => <PresetsIcon color={color} filled={filled} />, []);
  const renderStatsIcon = useCallback((color: string, filled: boolean) => <StatsIcon color={color} filled={filled} />, []);
  const renderSettingsIcon = useCallback((color: string) => <SettingsIcon color={color} />, []);

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
          renderIcon={renderHomeIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Presets"
          isActive={activeTab === 'presets'}
          onPress={handlePresetsPress}
          renderIcon={renderPresetsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Stats"
          isActive={activeTab === 'stats'}
          onPress={handleStatsPress}
          renderIcon={renderStatsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Settings"
          isActive={activeTab === 'settings'}
          onPress={handleSettingsPress}
          renderIcon={renderSettingsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
      </View>
    </View>
  );
}

export default memo(BottomTabBar);
