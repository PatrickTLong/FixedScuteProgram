import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Freeze } from 'react-freeze';
import {
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  NativeEventEmitter,
  FlatList,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedCheckbox, { AnimatedCheckboxRef } from '../components/AnimatedCheckbox';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';
import { XCircleIcon, CaretRightIcon, PlusIcon as PhosphorPlusIcon, MagicWandIcon, AndroidLogoIcon, SquaresFourIcon, CursorClickIcon, PlusCircleIcon } from 'phosphor-react-native';
import ReplyArrowIcon from '../components/ReplyArrowIcon';
import ExcludedAppsInfoModal from '../components/ExcludedAppsInfoModal';
import { Preset } from '../components/PresetCard';
import HeaderIconButton from '../components/HeaderIconButton';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { usePresetSave } from '../navigation/PresetsStack';



const EXCLUDED_APPS_INFO_DISMISSED_KEY = 'excluded_apps_info_dismissed';

// ============ Icon Components ============

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <XCircleIcon size={size} color={color} weight="fill" />
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#9CA3AF" }: { size?: number; color?: string }) => (
  <CaretRightIcon size={size} color={color} weight="fill" />
);

const ForwardIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <ReplyArrowIcon size={size} color={color} direction="right" />
);

const SearchIcon = ({ size = iconSize.md, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m1.99 12L8 16l2-6 6-2z" />
  </Svg>
);

const PlusIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <PhosphorPlusIcon size={size} color={color} weight="fill" />
);

const GlobeIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 22c1.38 0 3.27-3.4 3.48-9H8.52c.2 5.6 2.1 9 3.48 9m0-20c-1.38 0-3.27 3.4-3.48 9h6.96c-.2-5.6-2.1-9-3.48-9m3.53.65c1.17 2.12 1.83 5.22 1.95 8.35h4.47c-.38-3.83-2.94-7.03-6.42-8.35m0 18.7c3.48-1.32 6.04-4.51 6.42-8.35h-4.47c-.12 3.12-.78 6.23-1.95 8.35M2.05 13c.38 3.83 2.94 7.03 6.42 8.35C7.3 19.23 6.64 16.13 6.52 13zm0-2h4.47c.12-3.12.78-6.23 1.95-8.35C4.99 3.97 2.43 7.16 2.05 11" />
  </Svg>
);

const AndroidIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <AndroidLogoIcon size={size} color={color} weight="fill" />
);

const AppsIcon = ({ size = iconSize.sm, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <SquaresFourIcon size={size} color={color} weight="fill" />
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
  'com.android.camera',
  'com.android.camera2',
  'com.google.android.GoogleCamera',
  'com.samsung.android.camera',
  'com.sec.android.app.camera',
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

// ============ AppItemRow (with tap scale animation) ============

type TabType = 'apps' | 'websites';

const AppItemRow = memo(({ item, isSelected, onToggle, colors, s, skipCheckboxAnimation }: {
  item: InstalledApp;
  isSelected: boolean;
  onToggle: (id: string) => void;
  colors: any;
  s: (v: number) => number;
  skipCheckboxAnimation: boolean;
}) => {
  const checkboxRef = useRef<AnimatedCheckboxRef>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;



  const handlePress = useCallback(() => {
    onToggle(item.id);
    // Scale down and bounce back animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        duration: 30,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 14,
      }),
    ]).start();
  }, [item.id, onToggle, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-2">
      <Pressable
        onPress={handlePress}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          overflow: 'hidden',
          paddingVertical: s(buttonPadding.standard + 4),
          ...shadow.card,
        }}
        className="flex-row items-center px-5"
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
        <Text style={{ color: colors.text }} className={`flex-1 ${textSize.small} ${fontFamily.regular}`}>{item.name}</Text>
        <View pointerEvents="none">
          <AnimatedCheckbox ref={checkboxRef} checked={isSelected} size={s(iconSize.lg)} skipAnimation={skipCheckboxAnimation} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ============ WebsiteItemRow ============

const WebsiteItemRow = memo(({ site, onRemove, colors, s }: {
  site: string;
  onRemove: (site: string) => void;
  colors: any;
  s: (v: number) => number;
}) => {
  return (
    <View
      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: s(buttonPadding.standard + 4), ...shadow.card }}
      className={`flex-row items-center px-5 ${radius.xl} mb-2`}
    >
      <View className="w-10 h-10 items-center justify-center mr-3">
        <GlobeIcon size={s(iconSize.xl)} color={colors.textSecondary} />
      </View>
      <Text style={{ color: colors.text }} className={`flex-1 ${textSize.small} ${fontFamily.regular}`}>{site}</Text>
      <HeaderIconButton onPress={() => onRemove(site)}>
        <XIcon size={s(iconSize.headerNav)} color={colors.text} />
      </HeaderIconButton>
    </View>
  );
});

// ============ Screen Component ============

function EditPresetAppsScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'EditPresetApps'>>();
  const { getEditingPreset, getEmail, getExistingPresets, getPresetSettingsParams, setPresetSettingsParams, setFinalSettingsState } = usePresetSave();

  // State
  const [name, setName] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const selectedAppsSet = useMemo(() => new Set(selectedApps), [selectedApps]);
  const [skipCheckboxAnimation, setSkipCheckboxAnimation] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [websiteFocused, setWebsiteFocused] = useState(false);
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

  // Reload app list when apps are installed/uninstalled
  useEffect(() => {
    if (Platform.OS !== 'android' || !InstalledAppsModule) return;
    const emitter = new NativeEventEmitter(InstalledAppsModule);
    const subscription = emitter.addListener('onAppsChanged', async () => {
      invalidateInstalledAppsCache();
      try {
        const apps = await loadInstalledAppsOnce();
        setInstalledApps(apps);
      } catch {
        // Failed to reload apps
      }
    });
    return () => subscription.remove();
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
      setSearchQuery('');
      setSkipCheckboxAnimation(true);
      requestAnimationFrame(() => {
        setSkipCheckboxAnimation(false);
      });
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Filtered apps for search (uses debounced query to avoid re-render on every keystroke)
  const filteredApps = useMemo(() =>
    installedApps.filter(app =>
      app.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ),
    [installedApps, debouncedSearchQuery]
  );

  // Tab switch — optimistic: highlight tab instantly, swap content next frame
  const switchTab = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
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
    setFinalSettingsState(null);
    setPresetSettingsParams(null);
    navigation.navigate('Presets');
  }, [navigation, setPresetSettingsParams, setFinalSettingsState]);

  // Keep a ref to selectedAppsSet so renderAppItem can read it without re-creating
  const selectedAppsSetRef = useRef(selectedAppsSet);
  selectedAppsSetRef.current = selectedAppsSet;

  // Render app item — does NOT depend on selectedApps; extraData handles re-renders
  const renderAppItem = useCallback(({ item }: { item: InstalledApp }) => {
    const isSelected = selectedAppsSetRef.current.has(item.id);
    return (
      <AppItemRow
        item={item}
        isSelected={isSelected}
        onToggle={toggleApp}
        colors={colors}
        s={s}
        skipCheckboxAnimation={skipCheckboxAnimation}
      />
    );
  }, [toggleApp, colors, s, skipCheckboxAnimation]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const renderWebsiteItem = useCallback(({ item }: { item: string }) => (
    <WebsiteItemRow site={item} onRemove={removeWebsite} colors={colors} s={s} />
  ), [removeWebsite, colors, s]);

  const websiteKeyExtractor = useCallback((item: string) => item, []);

  const ListHeaderComponent = useMemo(() => (
    <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} mb-5`}>
      {installedSelectedApps.length} app{installedSelectedApps.length !== 1 ? 's' : ''} selected
    </Text>
  ), [installedSelectedApps.length, colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header — key forces SVG remount on focus to fix react-freeze stroke color bug */}
      <View key={svgKey} style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={handleClose}>
          <XIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>
          {getEditingPreset() ? 'Edit Preset' : 'New Preset'}
        </Text>
        <HeaderIconButton onPress={handleContinue} disabled={!canContinue}>
          <ForwardIcon size={s(iconSize.headerNav)} color={canContinue ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Preset Name Input */}
        <View className="px-6 py-4">
          <View
            style={{ backgroundColor: nameFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: nameFocused ? colors.cardDark : colors.border, paddingLeft: s(12), ...shadow.card }}
            className={`${radius.full} ${pill} flex-row items-center`}
          >
            <MagicWandIcon size={s(iconSize.headerNav)} color={colors.textSecondary} weight="fill" />
            <TextInput
              placeholder="Preset Name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={50}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
              className={`${textSize.extraSmall} ${fontFamily.semibold}`}
            />
            <Text style={{ color: colors.textMuted, marginLeft: s(8) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
              {name.length}/50
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row mx-6 mb-4">
          <Pressable
            onPress={() => switchTab('apps')}
            android_ripple={{ color: activeTab === 'apps' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
            style={{ flex: 1, backgroundColor: activeTab === 'apps' ? colors.text : colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', ...shadow.card }}
            className={`${pill} items-center justify-center flex-row`}
          >
            <AndroidIcon size={s(iconSize.lg)} color={activeTab === 'apps' ? colors.bg : colors.text} />
            <Text style={{ color: activeTab === 'apps' ? colors.bg : colors.text, marginLeft: s(6) }} className={`${textSize.small} ${fontFamily.semibold}`}>
              Apps
            </Text>
          </Pressable>
          <View className="w-2" />
          <Pressable
            onPress={() => switchTab('websites')}
            android_ripple={{ color: activeTab === 'websites' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
            style={{ flex: 1, backgroundColor: activeTab === 'websites' ? colors.text : colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', ...shadow.card }}
            className={`${pill} items-center justify-center flex-row`}
          >
            <GlobeIcon size={s(iconSize.lg)} color={activeTab === 'websites' ? colors.bg : colors.text} />
            <Text style={{ color: activeTab === 'websites' ? colors.bg : colors.text, marginLeft: s(6) }} className={`${textSize.small} ${fontFamily.semibold}`}>
              Websites
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          {/* Apps tab - stays mounted, hidden via opacity to avoid layout recomputation */}
          <Freeze freeze={activeTab !== 'apps'}>
          <View style={{ ...StyleSheet.absoluteFillObject, opacity: activeTab === 'apps' ? 1 : 0, zIndex: activeTab === 'apps' ? 1 : 0 }} pointerEvents={activeTab === 'apps' ? 'auto' : 'none'}>
            {Platform.OS === 'ios' ? (
              // iOS: Show button to open native FamilyActivityPicker
              <View className="flex-1 px-6 pt-4">
                <Pressable
                  onPress={openIOSAppPicker}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', paddingVertical: s(buttonPadding.standard + 4), ...shadow.card }}
                  className="flex-row items-center px-5 mb-4"
                >
                  <View style={{ width: s(48), height: s(48), marginRight: s(16) }} className={`${radius.xl} items-center justify-center`}>
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
                  <ChevronRightIcon size={s(iconSize.chevron)} color={colors.textSecondary} />
                </Pressable>

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
                    style={{ backgroundColor: searchFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: searchFocused ? colors.cardDark : colors.border, paddingLeft: s(12), ...shadow.card }}
                    className={`${radius.full} ${pill} flex-row items-center`}
                  >
                    <SearchIcon size={s(iconSize.headerNav)} color={colors.textSecondary} />
                    <TextInput
                      placeholder="Search apps..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                      className={`${textSize.extraSmall} ${fontFamily.semibold}`}
                    />
                  </View>
                </View>

                {/* Select All / Deselect All Buttons */}
                {!loadingApps && filteredApps.length > 0 && (
                  <View className="flex-row px-6 mb-3">
                    <Pressable
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
                      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                      style={{ flex: 1, marginRight: s(8), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
                      className="items-center justify-center"
                    >
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        Select All
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSkipCheckboxAnimation(true);
                        setTimeout(() => setSkipCheckboxAnimation(false), 50);
                        const filteredIds = new Set(filteredApps.map(app => app.id));
                        setSelectedApps(prev => prev.filter(id => !filteredIds.has(id)));
                      }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                      style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', paddingVertical: s(buttonPadding.smallStandard), ...shadow.card }}
                      className="items-center justify-center"
                    >
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        Deselect All
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Apps count */}
                <View style={{ paddingHorizontal: s(24) }}>
                  {ListHeaderComponent}
                </View>

                {/* Apps List - loading dots on first load, then persists */}
                {loadingApps ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                    <LoadingSpinner size={s(48)} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredApps}
                    renderItem={renderAppItem}
                    keyExtractor={keyExtractor}
                    extraData={selectedApps}
                    contentContainerStyle={{ paddingHorizontal: s(24), paddingBottom: s(24) + insets.bottom }}
                    removeClippedSubviews={true}
                    initialNumToRender={8}
                    maxToRenderPerBatch={4}
                    windowSize={3}
                    updateCellsBatchingPeriod={30}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </>
            )}
          </View>
          </Freeze>

          {/* Websites tab - stays mounted, hidden via opacity to avoid layout recomputation */}
          <Freeze freeze={activeTab !== 'websites'}>
          <View style={{ ...StyleSheet.absoluteFillObject, opacity: activeTab === 'websites' ? 1 : 0, zIndex: activeTab === 'websites' ? 1 : 0 }} pointerEvents={activeTab === 'websites' ? 'auto' : 'none'}>
            <View className="flex-1 px-6">
              {/* Website Input */}
              <View className="flex-row items-center mb-4">
                <View
                  style={{ backgroundColor: websiteFocused ? colors.cardDark : colors.card, borderWidth: 1, borderColor: websiteFocused ? colors.cardDark : colors.border, paddingLeft: s(12), ...shadow.card, flex: 1 }}
                  className={`${radius.full} ${pill} flex-row items-center mr-2`}
                >
                  <CursorClickIcon size={s(iconSize.md)} color={colors.textSecondary} weight="fill" />
                  <TextInput
                    placeholder="e.g. instagram.com"
                    placeholderTextColor={colors.textSecondary}
                    value={websiteInput}
                    onChangeText={setWebsiteInput}
                    autoCapitalize="none"
                    keyboardType="url"
                    onFocus={() => setWebsiteFocused(true)}
                    onBlur={() => setWebsiteFocused(false)}
                    style={{ color: colors.text, flex: 1, marginLeft: s(8), paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                    className={`${textSize.extraSmall} ${fontFamily.semibold}`}
                  />
                </View>
                <HeaderIconButton onPress={addWebsite}>
                  <PlusCircleIcon size={s(iconSize.headerNav)} color="#fff" weight="fill" />
                </HeaderIconButton>
              </View>

              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-4`}>
                Enter URLs like: instagram.com, reddit.com, etc
              </Text>

              {/* Website List */}
              <FlatList
                data={blockedWebsites}
                renderItem={renderWebsiteItem}
                keyExtractor={websiteKeyExtractor}
                contentContainerStyle={{ paddingBottom: s(24) + insets.bottom }}
                removeClippedSubviews={true}
                initialNumToRender={10}
                maxToRenderPerBatch={6}
                windowSize={3}
                updateCellsBatchingPeriod={30}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} py-8`}>
                    No websites blocked yet
                  </Text>
                }
              />
            </View>
          </View>
          </Freeze>
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
    </View>
  );
}

export default memo(EditPresetAppsScreen);
