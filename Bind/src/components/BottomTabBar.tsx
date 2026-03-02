import React, { memo, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';
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
  renderIcon: (color: string, filled: boolean) => React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}

const TabItem = memo(({ isActive, onPress, renderIcon, activeColor, inactiveColor }: TabItemProps) => {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const activeScale = useRef(new Animated.Value(isActive ? 1.2 : 1)).current;
  const activeTranslateY = useRef(new Animated.Value(isActive ? -3 : 0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Scale up and raise the active tab icon
  useEffect(() => {
    Animated.parallel([
      Animated.timing(activeScale, {
        toValue: isActive ? 1.2 : 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(activeTranslateY, {
        toValue: isActive ? -3 : 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, activeScale, activeTranslateY]);

  const triggerFlash = useCallback(() => {
    if (flashAnimRef.current) flashAnimRef.current.stop();
    flashOpacity.setValue(0.15);
    iconScale.setValue(1.2);
  }, [flashOpacity, iconScale]);

  const handlePressOut = useCallback(() => {
    flashAnimRef.current = Animated.parallel([
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]);
    flashAnimRef.current.start();
  }, [flashOpacity, iconScale]);

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
            { scale: iconScale },
            { scale: activeScale },
            { translateY: activeTranslateY },
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

  const renderHomeIcon = useCallback((color: string, filled: boolean) =>
    filled ? (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
        <Path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
        <Path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
      </Svg>
    ) : (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ), []);

  const renderPresetsIcon = useCallback((color: string, filled: boolean) =>
    filled ? (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
        <Path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
        <Path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
        <Path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
        <Path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
      </Svg>
    ) : (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ), []);

  const renderOverlaysIcon = useCallback((color: string, filled: boolean) =>
    filled ? (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" clipRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" />
      </Svg>
    ) : (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ), []);

  const renderStatsIcon = useCallback((color: string, filled: boolean) =>
    filled ? (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" clipRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9Z" />
      </Svg>
    ) : (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ), []);

  const renderSettingsIcon = useCallback((color: string, filled: boolean) =>
    filled ? (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill={color}>
        <Path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      </Svg>
    ) : (
      <Svg width={TAB_ICON_SIZE} height={TAB_ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ), []);

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
