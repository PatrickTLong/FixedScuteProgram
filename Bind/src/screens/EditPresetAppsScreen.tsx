import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  NativeEventEmitter,
  FlatList,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import AnimatedCheckbox from '../components/AnimatedCheckbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';
import ExcludedAppsInfoModal from '../components/ExcludedAppsInfoModal';
import { Preset } from '../components/PresetCard';
import { lightTap } from '../utils/haptics';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { usePresetSave } from '../navigation/PresetsStack';

const EXCLUDED_APPS_INFO_DISMISSED_KEY = 'excluded_apps_info_dismissed';

// ============ Icon Components ============

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = iconSize.lg, color = "#9CA3AF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GlobeIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AndroidIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"
      fill={color}
    />
  </Svg>
);

const AppsIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
  </Svg>
);

// ============ Expandable Info ============

const ExpandableInfo = ({ expanded, children, lazy = false }: { expanded: boolean; children: React.ReactNode; lazy?: boolean }) => {
  if (lazy && !expanded) return null;
  if (!expanded) return null;
  return (
    <View>
      {children}
    </View>
  );
};

// ============ Installed Apps Cache ============

interface InstalledApp {
  id: string;
  name: string;
  icon?: string;
}

let cachedInstalledApps: InstalledApp[] | null = null;
let installedAppsLoadPromise: Promise<InstalledApp[]> | null = null;

function invalidateInstalledAppsCache() {
  cachedInstalledApps = null;
  installedAppsLoadPromise = null;
}

const { InstalledAppsModule } = NativeModules;
if (Platform.OS === 'android' && InstalledAppsModule) {
  const installedAppsEmitter = new NativeEventEmitter(InstalledAppsModule);
  installedAppsEmitter.addListener('onAppsChanged', () => {
    invalidateInstalledAppsCache();
  });
}

const EXCLUDED_PACKAGES = [
  'com.scuteapp',
  'com.android.settings',
  'com.android.dialer',
  'com.google.android.dialer',
  'com.samsung.android.dialer',
  'com.android.phone',
  'com.android.emergency',
  'com.android.sos',
  'com.google.android.apps.safetyhub',
  'com.samsung.android.emergencymode',
];

async function loadInstalledAppsOnce(): Promise<InstalledApp[]> {
  if (cachedInstalledApps) {
    return cachedInstalledApps;
  }

  if (installedAppsLoadPromise) {
    return installedAppsLoadPromise;
  }

  installedAppsLoadPromise = (async () => {
    try {
      let apps: InstalledApp[] = [];
      if (InstalledAppsModule) {
        apps = await InstalledAppsModule.getInstalledApps();
      } else {
        apps = [
          { id: 'com.instagram.android', name: 'Instagram' },
          { id: 'com.zhiliaoapp.musically', name: 'TikTok' },
          { id: 'com.google.android.youtube', name: 'YouTube' },
          { id: 'com.twitter.android', name: 'X (Twitter)' },
          { id: 'com.facebook.katana', name: 'Facebook' },
          { id: 'com.snapchat.android', name: 'Snapchat' },
          { id: 'com.whatsapp', name: 'WhatsApp' },
          { id: 'com.reddit.frontpage', name: 'Reddit' },
          { id: 'com.discord', name: 'Discord' },
          { id: 'com.spotify.music', name: 'Spotify' },
        ];
      }
      apps = apps.filter(app =>
        !EXCLUDED_PACKAGES.includes(app.id) &&
        app.name.toLowerCase() !== 'all apps'
      );
      cachedInstalledApps = apps;
      return apps;
    } catch (error) {
      return [];
    } finally {
      installedAppsLoadPromise = null;
    }
  })();

  return installedAppsLoadPromise;
}

// ============ AppItemRow (no press animation) ============

type TabType = 'apps' | 'websites';

const AppItemRow = memo(({ item, isSelected, onToggle, onPressIn, colors, s, skipCheckboxAnimation }: {
  item: InstalledApp;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onPressIn?: () => void;
  colors: any;
  s: (v: number) => number;
  skipCheckboxAnimation: boolean;
}) => {
  return (
    <TouchableOpacity
      onPressIn={onPressIn}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.standard), ...shadow.card }}
      className={`flex-row items-center px-4 ${radius.xl} mb-2`}
    >
      {item.icon ? (
        <Image
          source={{ uri: item.icon }}
          style={{ width: s(48), height: s(48), marginRight: s(12) }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ width: s(48), height: s(48), marginRight: s(12), backgroundColor: colors.cardLight, borderRadius: s(12), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: s(18), fontWeight: 'bold' }}>
            {item.name.charAt(0)}
          </Text>
        </View>
      )}
      <Text style={{ color: colors.text }} className={`flex-1 ${textSize.base} ${fontFamily.regular}`}>{item.name}</Text>
      <AnimatedCheckbox checked={isSelected} size={s(iconSize.lg)} skipAnimation={skipCheckboxAnimation} />
    </TouchableOpacity>
  );
});

// ============ Screen Component ============

function EditPresetAppsScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'EditPresetApps'>>();
  const { getEditingPreset, getEmail, getExistingPresets, getPresetSettingsParams, setPresetSettingsParams } = usePresetSave();

  // State
  const [name, setName] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [skipCheckboxAnimation, setSkipCheckboxAnimation] = useState(false);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [displayedTab, setDisplayedTab] = useState<TabType>('apps');
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [iosSelectedAppsCount, setIosSelectedAppsCount] = useState(0);
  const [excludedAppsInfoVisible, setExcludedAppsInfoVisible] = useState(false);
  const [svgKey, setSvgKey] = useState(0);
  const appsLoadedRef = useRef(false);

  // Load installed apps once on mount (screen is eagerly mounted, not lazy)
  useEffect(() => {
    if (appsLoadedRef.current) return;
    (async () => {
      if (Platform.OS === 'ios') {
        try {
          if (InstalledAppsModule?.getSelectedAppsCount) {
            const count = await InstalledAppsModule.getSelectedAppsCount();
            setIosSelectedAppsCount(count);
          }
        } catch {
          // Failed to get iOS app count
        }
        setLoadingApps(false);
        appsLoadedRef.current = true;
        return;
      }

      if (cachedInstalledApps) {
        setInstalledApps(cachedInstalledApps);
        setLoadingApps(false);
        appsLoadedRef.current = true;
        return;
      }

      setLoadingApps(true);
      try {
        const apps = await loadInstalledAppsOnce();
        setInstalledApps(apps);
      } catch {
        // Failed to load apps
      } finally {
        setLoadingApps(false);
        appsLoadedRef.current = true;
      }
    })();
  }, []);

  // iOS: Open native FamilyActivityPicker
  const openIOSAppPicker = useCallback(async () => {
    if (Platform.OS !== 'ios' || !InstalledAppsModule?.showAppPicker) return;

    try {
      const result = await InstalledAppsModule.showAppPicker();
      if (result?.success) {
        setIosSelectedAppsCount(result.appCount || 0);
      }
    } catch (error) {
      // User cancelled or error occurred
    }
  }, []);

  // Reinitialize from preset each time screen gains focus (screen stays mounted)
  // Skip reset when returning from PresetSettings (presetSettingsParams is still set)
  useFocusEffect(
    useCallback(() => {
      setSvgKey(k => k + 1);

      const currentParams = getPresetSettingsParams();
      if (currentParams) {
        // Returning from PresetSettings — keep current state
        return;
      }

      const preset = getEditingPreset();
      if (preset) {
        setName(preset.name);
        setBlockedWebsites(preset.blockedWebsites);
        if (preset.mode === 'all' && installedApps.length > 0) {
          setSelectedApps(installedApps.map(app => app.id));
        } else if (preset.mode === 'all') {
          setSelectedApps([]);
        } else {
          setSelectedApps(preset.selectedApps);
        }
      } else {
        // New preset defaults
        setName('');
        setSelectedApps([]);
        setBlockedWebsites([]);
      }
      setActiveTab('apps');
      setDisplayedTab('apps');
      setSearchQuery('');
      setSkipCheckboxAnimation(true);
      // Check if we should show excluded apps info modal
      AsyncStorage.getItem(EXCLUDED_APPS_INFO_DISMISSED_KEY).then((dismissed) => {
        if (dismissed !== 'true') {
          setExcludedAppsInfoVisible(true);
        }
      });
    }, [getEditingPreset, getPresetSettingsParams, installedApps])
  );

  const toggleApp = useCallback((appId: string) => {
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  }, []);

  const addWebsite = useCallback(() => {
    const trimmed = websiteInput.trim().toLowerCase();
    if (trimmed && !blockedWebsites.includes(trimmed)) {
      if (trimmed.includes('.')) {
        setBlockedWebsites(prev => [...prev, trimmed]);
        setWebsiteInput('');
      }
    }
  }, [websiteInput, blockedWebsites]);

  const removeWebsite = useCallback((site: string) => {
    setBlockedWebsites(prev => prev.filter(s => s !== site));
  }, []);

  // Filter selectedApps to only count apps that are still installed
  const installedSelectedApps = useMemo(() => {
    const installedIds = new Set(installedApps.map(app => app.id));
    return selectedApps.filter(id => installedIds.has(id));
  }, [selectedApps, installedApps]);

  // Check if preset can proceed
  const canContinue = useMemo(() => {
    const hasApps = Platform.OS === 'ios'
      ? iosSelectedAppsCount > 0
      : installedSelectedApps.length > 0;
    return name.trim() && (hasApps || blockedWebsites.length > 0);
  }, [name, installedSelectedApps.length, blockedWebsites.length, iosSelectedAppsCount]);

  // Filtered apps for search
  const filteredApps = useMemo(() =>
    installedApps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [installedApps, searchQuery]
  );

  // Tab switch
  const switchTab = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setDisplayedTab(newTab);
  }, [activeTab]);

  // Continue handler
  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    setPresetSettingsParams({
      name,
      selectedApps,
      blockedWebsites,
      installedApps,
      iosSelectedAppsCount,
    });
    navigation.navigate('PresetSettings');
  }, [canContinue, navigation, name, selectedApps, blockedWebsites, installedApps, iosSelectedAppsCount, setPresetSettingsParams]);

  // Close handler
  const handleClose = useCallback(() => {
    setPresetSettingsParams(null);
    navigation.navigate('Presets');
  }, [navigation, setPresetSettingsParams]);

  // Render app item
  const renderAppItem = useCallback(({ item }: { item: InstalledApp }) => {
    const isSelected = selectedApps.includes(item.id);
    return (
      <AppItemRow
        item={item}
        isSelected={isSelected}
        onToggle={toggleApp}
        onPressIn={lightTap}
        colors={colors}
        s={s}
        skipCheckboxAnimation={skipCheckboxAnimation}
      />
    );
  }, [selectedApps, toggleApp, colors, s, skipCheckboxAnimation]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const ListHeaderComponent = useMemo(() =>
    installedSelectedApps.length > 0 ? (
      <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} mb-3`}>
        {installedSelectedApps.length} app{installedSelectedApps.length !== 1 ? 's' : ''} selected
      </Text>
    ) : null,
    [installedSelectedApps.length, colors]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header — key forces SVG remount on focus to fix react-freeze stroke color bug */}
      <View key={svgKey} style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} className="flex-row items-center justify-between px-4 py-3.5">
        <TouchableOpacity onPressIn={lightTap} onPress={handleClose} className="px-2">
          <XIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
          {getEditingPreset() ? 'Edit Preset' : 'New Preset'}
        </Text>
        <TouchableOpacity
          onPressIn={lightTap}
          onPress={handleContinue}
          disabled={!canContinue}
          className="px-2"
        >
          <ChevronRightIcon size={s(iconSize.headerNav)} color={canContinue ? '#FFFFFF' : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Preset Name Input */}
        <View className="px-6 py-4">
          <View
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
            className={`${radius.xl} px-4 h-12 flex-row items-center`}
          >
            <EditIcon size={s(iconSize.sm)} color={colors.textSecondary} />
            <TextInput
              placeholder="Preset Name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={20}
              style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
              className={`${textSize.small} ${fontFamily.semibold}`}
            />
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row mx-6 mb-4">
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={() => switchTab('apps')}
            style={{ backgroundColor: activeTab === 'apps' ? colors.text : colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
            className={`flex-1 ${radius.full} items-center justify-center flex-row`}
          >
            <AndroidIcon size={s(iconSize.lg)} color={activeTab === 'apps' ? colors.bg : colors.text} />
            <Text style={{ color: activeTab === 'apps' ? colors.bg : colors.text, marginLeft: 6 }} className={`${textSize.small} ${fontFamily.semibold}`}>
              Apps
            </Text>
          </TouchableOpacity>
          <View className="w-2" />
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={() => switchTab('websites')}
            style={{ backgroundColor: activeTab === 'websites' ? colors.text : colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
            className={`flex-1 ${radius.full} items-center justify-center flex-row`}
          >
            <GlobeIcon size={s(iconSize.lg)} color={activeTab === 'websites' ? colors.bg : colors.text} />
            <Text style={{ color: activeTab === 'websites' ? colors.bg : colors.text, marginLeft: 6 }} className={`${textSize.small} ${fontFamily.semibold}`}>
              Websites
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {displayedTab === 'apps' ? (
            Platform.OS === 'ios' ? (
              // iOS: Show button to open native FamilyActivityPicker
              <View className="flex-1 px-6 pt-4">
                <TouchableOpacity
                  onPress={openIOSAppPicker}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.standard), ...shadow.card }}
                  className={`flex-row items-center px-4 ${radius.xl} mb-4`}
                >
                  <View className={`w-12 h-12 ${radius.xl} items-center justify-center mr-4`}>
                    <AppsIcon size={s(iconSize.lg)} color={colors.text} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
                      Select Apps to Block
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
                      {iosSelectedAppsCount > 0
                        ? `${iosSelectedAppsCount} app${iosSelectedAppsCount !== 1 ? 's' : ''} selected`
                        : 'Tap to choose apps'}
                    </Text>
                  </View>
                  <ChevronRightIcon size={s(iconSize.lg)} color={colors.textSecondary} />
                </TouchableOpacity>

                <Text style={{ color: colors.textMuted }} className={`${textSize.small} ${fontFamily.regular} text-center px-4`}>
                  iOS uses Screen Time to block apps. Tap above to open the app picker.
                </Text>
              </View>
            ) : (
              // Android: Show searchable list of apps
              <>
                {/* Search */}
                <View className="px-6 mb-4">
                  <View
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                    className={`${radius.xl} px-4 h-12 flex-row items-center`}
                  >
                    <SearchIcon size={s(iconSize.sm)} color={colors.textSecondary} />
                    <TextInput
                      placeholder="Search apps..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.small} ${fontFamily.semibold}`}
                    />
                  </View>
                </View>

                {/* Select All / Deselect All Buttons */}
                {!loadingApps && filteredApps.length > 0 && (
                  <View className="flex-row px-6 mb-3">
                    <TouchableOpacity
                      onPressIn={lightTap}
                      onPress={() => {
                        setSkipCheckboxAnimation(true);
                        setTimeout(() => setSkipCheckboxAnimation(false), 50);
                        const filteredIds = filteredApps.map(app => app.id);
                        setSelectedApps(prev => {
                          const newSet = new Set(prev);
                          filteredIds.forEach(id => newSet.add(id));
                          return Array.from(newSet);
                        });
                      }}
                      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
                      className={`flex-1 ${radius.full} items-center justify-center mr-2`}
                    >
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        Select All
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPressIn={lightTap}
                      onPress={() => {
                        setSkipCheckboxAnimation(true);
                        setTimeout(() => setSkipCheckboxAnimation(false), 50);
                        const filteredIds = new Set(filteredApps.map(app => app.id));
                        setSelectedApps(prev => prev.filter(id => !filteredIds.has(id)));
                      }}
                      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
                      className={`flex-1 ${radius.full} items-center justify-center`}
                    >
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        Deselect All
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Apps List */}
                {loadingApps ? (
                  <View className="flex-1 items-center justify-center">
                    <Lottie
                      source={require('../frontassets/Loading Dots Blue.json')}
                      autoPlay
                      loop
                      speed={2}
                      style={{ width: s(250), height: s(250) }}
                    />
                  </View>
                ) : (
                  <FlatList
                    data={filteredApps}
                    renderItem={renderAppItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingHorizontal: s(24), paddingBottom: s(24) }}
                    ListHeaderComponent={ListHeaderComponent}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={15}
                    windowSize={10}
                    initialNumToRender={15}
                  />
                )}
              </>
            )
          ) : (
            <ScrollView className="flex-1 px-6">
              {/* Website Input */}
              <View className="flex-row items-center mb-4">
                <View
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                  className={`flex-1 ${radius.xl} px-4 h-12 flex-row items-center mr-2`}
                >
                  <GlobeIcon size={s(iconSize.md)} color={colors.textSecondary} />
                  <TextInput
                    placeholder="e.g. instagram.com"
                    placeholderTextColor={colors.textSecondary}
                    value={websiteInput}
                    onChangeText={setWebsiteInput}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                    className={`${textSize.small} ${fontFamily.semibold}`}
                  />
                </View>
                <TouchableOpacity
                  onPress={addWebsite}
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                  className={`w-11 h-11 ${radius.full} items-center justify-center`}
                >
                  <Text className={`text-white ${textSize['2xLarge']} ${fontFamily.light}`}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-4`}>
                Enter URLs like: instagram.com, reddit.com, etc
              </Text>

              {/* Website List */}
              {blockedWebsites.map((site) => (
                <View
                  key={site}
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                  className={`flex-row items-center py-3 px-4 ${radius.xl} mb-2`}
                >
                  <View className="w-10 h-10 items-center justify-center mr-3">
                    <GlobeIcon size={s(iconSize.xl)} color={colors.textSecondary} />
                  </View>
                  <Text style={{ color: colors.text }} className={`flex-1 ${textSize.base} ${fontFamily.regular}`}>{site}</Text>
                  <TouchableOpacity
                    onPress={() => removeWebsite(site)}
                    className="p-2"
                  >
                    <XIcon size={s(iconSize.sm)} color={colors.text} />
                  </TouchableOpacity>
                </View>
              ))}

              {blockedWebsites.length === 0 && (
                <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.base} ${fontFamily.regular} py-8`}>
                  No websites blocked yet
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Excluded Apps Info Modal */}
      <ExcludedAppsInfoModal
        visible={excludedAppsInfoVisible}
        onClose={async (dontShowAgain) => {
          setExcludedAppsInfoVisible(false);
          if (dontShowAgain) {
            await AsyncStorage.setItem(EXCLUDED_APPS_INFO_DISMISSED_KEY, 'true');
          }
        }}
      />
    </SafeAreaView>
  );
}

export default memo(EditPresetAppsScreen);
