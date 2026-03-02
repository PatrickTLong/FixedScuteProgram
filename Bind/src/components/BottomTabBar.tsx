import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';
import BoxiconsFilled from '../components/BoxiconsFilled';
import { useTheme, iconSize, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import type { BottomTabBarProps as RNBottomTabBarProps } from '@react-navigation/bottom-tabs';

type TabName = 'home' | 'presets' | 'overlays' | 'stats' | 'settings';

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
const HIDDEN_ROUTES = ['EditPresetApps', 'PresetSettings', 'OverlayEditor', 'DatePicker'];

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
      overlays: 'Overlays',
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
  const handleOverlaysPress = useCallback(() => handleTabPress('overlays'), [handleTabPress]);
  const handleStatsPress = useCallback(() => handleTabPress('stats'), [handleTabPress]);
  const handleSettingsPress = useCallback(() => handleTabPress('settings'), [handleTabPress]);

  const bottomPadding = Math.max(insets.bottom, s(24));

  const renderHomeIcon = useCallback((color: string) =>
    <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
      <Path d="M12.71 2.29a.996.996 0 0 0-1.41 0l-8.01 8A1 1 0 0 0 3 11v9c0 1.1.9 2 2 2h3c.55 0 1-.45 1-1v-7h6v7c0 .55.45 1 1 1h3c1.1 0 2-.9 2-2v-9c0-.27-.11-.52-.29-.71z" />
    </Svg>, []);

  const renderPresetsIcon = useCallback((color: string) =>
    <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 3h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 3h4v4h-4zm7 0h4v4h-4zM3 17h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 17h4v4h-4zm7 0h4v4h-4zM3 10h4v4H3zm7 0h4v4h-4z" />
      <Path d="M10 10h4v4h-4zm7 0h4v4h-4z" />
    </Svg>, []);

  const renderOverlaysIcon = useCallback((color: string) =>
    <BoxiconsFilled name="bx-image-landscape" size={TAB_ICON_SIZE + 6} color={color} />, []);

  const renderStatsIcon = useCallback((color: string) =>
    <BoxiconsFilled name="bx-trending-up" size={TAB_ICON_SIZE + 6} color={color} />, []);

  const renderSettingsIcon = useCallback((color: string) =>
    <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
      <Path d="m21.16 7.86-1-1.73a1.997 1.997 0 0 0-2.73-.73l-.53.31c-.58-.46-1.22-.83-1.9-1.11V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v.6c-.67.28-1.31.66-1.9 1.11l-.53-.31c-.96-.55-2.18-.22-2.73.73l-1 1.73c-.55.96-.22 2.18.73 2.73l.5.29c-.05.37-.08.74-.08 1.11s.03.74.08 1.11l-.5.29c-.96.55-1.28 1.78-.73 2.73l1 1.73c.55.95 1.78 1.28 2.73.73l.53-.31c.58.46 1.22.83 1.9 1.11v.6c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-.6a8.7 8.7 0 0 0 1.9-1.11l.53.31c.96.55 2.18.22 2.73-.73l1-1.73c.55-.96.22-2.18-.73-2.73l-.5-.29c.05-.37.08-.74.08-1.11s-.03-.74-.08-1.11l.5-.29c.96-.55 1.28-1.78.73-2.73M12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4" />
    </Svg>, []);

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
          isActive={activeTab === 'overlays'}
          onPress={handleOverlaysPress}
          renderIcon={renderOverlaysIcon}
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
