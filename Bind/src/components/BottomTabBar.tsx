import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HouseIcon, SquaresFourIcon, TrendUpIcon, GearSixIcon } from 'phosphor-react-native';
import { useTheme, iconSize, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import type { BottomTabBarProps as RNBottomTabBarProps } from '@react-navigation/bottom-tabs';

type TabName = 'home' | 'presets' | 'stats' | 'settings';

const TAB_ICON_SIZE = iconSize.xl;
const FLASH_SIZE = 80;

interface TabItemProps {
  isActive: boolean;
  onPress: () => void;
  renderIcon: (color: string, active: boolean) => React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}

const TabItem = memo(({ isActive, onPress, renderIcon, activeColor, inactiveColor }: TabItemProps) => {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(isActive ? 1.2 : 1)).current;
  const translateY = useRef(new Animated.Value(isActive ? -3 : 0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Scale up and raise the active tab icon
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: isActive ? 1.2 : 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: isActive ? -3 : 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, scale, translateY]);

  const triggerFlash = useCallback(() => {
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(0.15);
    scale.setValue(1.2);
  }, [flashOpacity, scale]);

  const handlePressOut = useCallback(() => {
    // Fade flash independently so scale interruptions don't cancel it
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashAnimRef.current = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    });
    flashAnimRef.current.start();

    const target = isActive ? 1.2 : 1;
    Animated.timing(scale, {
      toValue: target,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [flashOpacity, scale, isActive]);

  const displayColor = isActive ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      onPressIn={() => {
        triggerFlash();
        if (haptics.tabBar.enabled) triggerHaptic(haptics.tabBar.type);
      }}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className="flex-1 items-center justify-center py-3"
    >
      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.flash,
            { opacity: flashOpacity },
          ]}
        />
        <Animated.View style={{
          transform: [
            { scale },
            { translateY },
          ]
        }}>
          {renderIcon(displayColor, isActive)}
        </Animated.View>
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
const HIDDEN_ROUTES = ['EditPresetApps', 'PresetSettings', 'DatePicker'];

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

  const renderHomeIcon = useCallback((color: string, active: boolean) =>
    <HouseIcon size={TAB_ICON_SIZE} color={color} weight={active ? 'fill' : 'regular'} />, []);

  const renderPresetsIcon = useCallback((color: string, active: boolean) =>
    <SquaresFourIcon size={TAB_ICON_SIZE} color={color} weight={active ? 'fill' : 'regular'} />, []);

  const renderStatsIcon = useCallback((color: string, active: boolean) =>
    <TrendUpIcon size={TAB_ICON_SIZE + 6} color={color} weight={active ? 'fill' : 'regular'} />, []);

  const renderSettingsIcon = useCallback((color: string, active: boolean) =>
    <GearSixIcon size={TAB_ICON_SIZE} color={color} weight={active ? 'fill' : 'regular'} />, []);

  // Hide tab bar on preset editing screens
  if (HIDDEN_ROUTES.includes(currentRouteName)) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: bottomPadding,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dividerLight,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 12,
      }}
    >
      <View style={{ overflow: 'hidden' }} className="flex-row py-2">
        <TabItem
          isActive={activeTab === 'home'}
          onPress={handleHomePress}
          renderIcon={renderHomeIcon}
          activeColor={colors.text}
          inactiveColor="rgba(255,255,255,0.4)"
        />
        <TabItem
          isActive={activeTab === 'presets'}
          onPress={handlePresetsPress}
          renderIcon={renderPresetsIcon}
          activeColor={colors.text}
          inactiveColor="rgba(255,255,255,0.4)"
        />
        <TabItem
          isActive={activeTab === 'stats'}
          onPress={handleStatsPress}
          renderIcon={renderStatsIcon}
          activeColor={colors.text}
          inactiveColor="rgba(255,255,255,0.4)"
        />
        <TabItem
          isActive={activeTab === 'settings'}
          onPress={handleSettingsPress}
          renderIcon={renderSettingsIcon}
          activeColor={colors.text}
          inactiveColor="rgba(255,255,255,0.4)"
        />
      </View>
    </View>
  );
}

export default memo(BottomTabBar);
