import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { lightTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

type TabName = 'home' | 'presets' | 'settings';

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

interface TabItemProps {
  name: TabName;
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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

const TabItem = memo(({ name, label, isActive, onPress, icon, activeColor, inactiveColor }: TabItemProps) => {
  const handlePress = useCallback(() => {
    lightTap();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-1 items-center justify-center py-2"
    >
      {icon}
      <Text
        style={{ color: isActive ? activeColor : inactiveColor }}
        className={`${textSize.extraSmall} mt-1 ${fontFamily.regular}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const getIconColor = (tab: TabName) =>
    activeTab === tab ? colors.text : colors.textMuted;

  // Use safe area bottom inset with a minimum of 24px for devices without navigation buttons
  const bottomPadding = Math.max(insets.bottom, s(24));

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: bottomPadding,
        borderTopWidth: 1, borderTopColor: colors.border,
        ...shadow.tabBar,
      }}
      className="flex-row pt-2"
    >
      <TabItem
        name="home"
        label="Home"
        isActive={activeTab === 'home'}
        onPress={() => onTabPress('home')}
        icon={<HomeIcon color={getIconColor('home')} />}
        activeColor={colors.text}
        inactiveColor={colors.textMuted}
      />
      <TabItem
        name="presets"
        label="Presets"
        isActive={activeTab === 'presets'}
        onPress={() => onTabPress('presets')}
        icon={<PresetsIcon color={getIconColor('presets')} />}
        activeColor={colors.text}
        inactiveColor={colors.textMuted}
      />
      <TabItem
        name="settings"
        label="Settings"
        isActive={activeTab === 'settings'}
        onPress={() => onTabPress('settings')}
        icon={<SettingsIcon color={getIconColor('settings')} />}
        activeColor={colors.text}
        inactiveColor={colors.textMuted}
      />
    </View>
  );
}

export default memo(BottomTabBar);
