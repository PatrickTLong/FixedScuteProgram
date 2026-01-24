import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  NativeEventEmitter,
  FlatList,
  Image,
  Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import LottieToggle from './LottieToggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';
import TimerPicker from './TimerPicker';
import DatePickerModal from './DatePickerModal';
import ScheduleInfoModal from './ScheduleInfoModal';
import InfoModal from './InfoModal';
import ExcludedAppsInfoModal from './ExcludedAppsInfoModal';
import DisableTapoutWarningModal from './DisableTapoutWarningModal';
import BlockSettingsWarningModal from './BlockSettingsWarningModal';
import RecurrenceInfoModal from './RecurrenceInfoModal';
import StrictModeWarningModal from './StrictModeWarningModal';
import PresetGuideModal from './PresetGuideModal';
import { Preset } from './PresetCard';
import { getEmergencyTapoutStatus, setEmergencyTapoutEnabled } from '../services/cardApi';
import { lightTap, mediumTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

const SCHEDULE_INFO_DISMISSED_KEY = 'schedule_info_dismissed';
const EXCLUDED_APPS_INFO_DISMISSED_KEY = 'excluded_apps_info_dismissed';
const DISABLE_TAPOUT_WARNING_DISMISSED_KEY = 'disable_tapout_warning_dismissed';
const BLOCK_SETTINGS_WARNING_DISMISSED_KEY = 'block_settings_warning_dismissed';
const RECURRENCE_INFO_DISMISSED_KEY = 'recurrence_info_dismissed';
const STRICT_MODE_WARNING_DISMISSED_KEY = 'strict_mode_warning_dismissed';

// Recurring schedule unit types
type RecurringUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

// ============ Installed Apps Cache ============
// Cache installed apps globally to avoid reloading on every modal open
let cachedInstalledApps: InstalledApp[] | null = null;
let installedAppsLoadPromise: Promise<InstalledApp[]> | null = null;

// Function to invalidate the cache (called when apps are installed/uninstalled)
function invalidateInstalledAppsCache() {
  cachedInstalledApps = null;
  installedAppsLoadPromise = null;
}

// Set up listener for app install/uninstall events (Android only)
const { InstalledAppsModule } = NativeModules;
if (Platform.OS === 'android' && InstalledAppsModule) {
  const installedAppsEmitter = new NativeEventEmitter(InstalledAppsModule);
  installedAppsEmitter.addListener('onAppsChanged', () => {
    invalidateInstalledAppsCache();
  });
}

// System apps excluded from app selection
const EXCLUDED_PACKAGES = [
  'com.bind',                       // Scute (this app)
  'com.android.settings',           // Settings (has its own toggle)
  'com.android.dialer',             // Phone/Dialer
  'com.google.android.dialer',      // Google Phone
  'com.samsung.android.dialer',     // Samsung Phone
  'com.android.phone',              // Phone
  'com.android.camera',             // Camera
  'com.android.camera2',            // Camera
  'com.google.android.GoogleCamera',// Google Camera
  'com.samsung.android.camera',     // Samsung Camera
  'com.android.mms',                // Messaging
  'com.google.android.apps.messaging', // Google Messages
  'com.samsung.android.messaging',  // Samsung Messages
  'com.android.emergency',          // Emergency
  'com.android.sos',                // Emergency SOS
  'com.google.android.apps.safetyhub', // Google Safety/Emergency
  'com.samsung.android.emergencymode', // Samsung Emergency
];

async function loadInstalledAppsOnce(): Promise<InstalledApp[]> {
  // Return cached apps if available (already filtered)
  if (cachedInstalledApps) {
    return cachedInstalledApps;
  }

  // If already loading, wait for existing promise
  if (installedAppsLoadPromise) {
    return installedAppsLoadPromise;
  }

  // Start loading
  installedAppsLoadPromise = (async () => {
    try {
      let apps: InstalledApp[] = [];
      if (InstalledAppsModule) {
        apps = await InstalledAppsModule.getInstalledApps();
      } else {
        // Fallback mock data
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
      // Filter out system apps (phone, camera, messaging, emergency, settings)
      apps = apps.filter(app => !EXCLUDED_PACKAGES.includes(app.id));
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

// Calendar icon - white with thicker strokes
const CalendarIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Flag icon - white with thicker strokes (for end date)
const FlagIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron right icon
const ChevronRightIcon = ({ size = 24, color = "#9CA3AF" }: { size?: number; color?: string }) => (
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

// Apps/Grid icon for Apps tab
const AppsIcon = ({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
  </Svg>
);

// Globe icon for Websites tab
const GlobeIcon = ({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 12h20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Repeat/Recurrence icon - white with thicker strokes
const RepeatIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 1l4 4-4 4"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 11V9a4 4 0 014-4h14"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 23l-4-4 4-4"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 13v2a4 4 0 01-4 4H3"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface InstalledApp {
  id: string;
  name: string;
  icon?: string;
}

interface PresetEditModalProps {
  visible: boolean;
  preset: Preset | null;
  onClose: () => void;
  onSave: (preset: Preset) => Promise<void> | void;
  email: string;
  existingPresets?: Preset[];
}

type TabType = 'apps' | 'websites';

function PresetEditModal({ visible, preset, onClose, onSave, email, existingPresets = [] }: PresetEditModalProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');
  const [blockSettings, setBlockSettings] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(true);
  const [timerDays, setTimerDays] = useState(0);
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [displayedTab, setDisplayedTab] = useState<TabType>('apps');
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedStep, setDisplayedStep] = useState<'first' | 'final'>('first');
  // iOS-specific: track selected app count from native picker
  const [iosSelectedAppsCount, setIosSelectedAppsCount] = useState(0);

  // Step transition animation (same pattern as App.tsx tab transitions)
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const isStepTransitioning = useRef(false);

  // Step transition (first step <-> final step)
  const goToStep = useCallback((toFinal: boolean) => {
    if (isStepTransitioning.current) return;
    isStepTransitioning.current = true;

    // Fade out
    Animated.timing(stepFadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // Swap step while invisible
      setDisplayedStep(toFinal ? 'final' : 'first');
      // Small delay to ensure render completes before fading in
      requestAnimationFrame(() => {
        // Fade in
        Animated.timing(stepFadeAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }).start(() => {
          isStepTransitioning.current = false;
        });
      });
    });
  }, [stepFadeAnim]);

  // Tab switch (apps <-> websites)
  const switchTab = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setDisplayedTab(newTab);
  }, [activeTab]);
  const [isSaving, setIsSaving] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Emergency tapout feature (per-preset toggle)
  const [allowEmergencyTapout, setAllowEmergencyTapout] = useState(false);
  const [noTapoutsModalVisible, setNoTapoutsModalVisible] = useState(false);

  // Duplicate name modal
  const [duplicateNameModalVisible, setDuplicateNameModalVisible] = useState(false);

  // Excluded apps info modal
  const [excludedAppsInfoVisible, setExcludedAppsInfoVisible] = useState(false);

  // Disable tapout warning modal
  const [disableTapoutWarningVisible, setDisableTapoutWarningVisible] = useState(false);

  // Block settings warning modal
  const [blockSettingsWarningVisible, setBlockSettingsWarningVisible] = useState(false);

  // Strict mode feature
  const [strictMode, setStrictMode] = useState(false); // Default to false (slide-to-unlock available)
  const [strictModeWarningVisible, setStrictModeWarningVisible] = useState(false);

  // Preset guide modal
  const [guideModalVisible, setGuideModalVisible] = useState(false);

  // Handler to toggle emergency tapout - optimistic UI update, then validate
  const handleEmergencyTapoutToggle = useCallback(async (value: boolean) => {
    mediumTap();

    if (value) {
      // Enabling - validate that user has tapouts remaining
      setAllowEmergencyTapout(true);
      if (email) {
        try {
          const status = await getEmergencyTapoutStatus(email);
          if (status.remaining <= 0) {
            // Revert the toggle and show modal
            setAllowEmergencyTapout(false);
            setNoTapoutsModalVisible(true);
          }
        } catch (error) {
          // Failed to check emergency tapout status
        }
      }
    } else {
      // Disabling - check if we should show warning
      const dismissed = await AsyncStorage.getItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY);
      if (dismissed !== 'true') {
        setDisableTapoutWarningVisible(true);
      } else {
        // Warning already dismissed, just disable
        setAllowEmergencyTapout(false);
      }
    }
  }, [email]);

  // Scheduling feature
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | null>(null);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(null);
  const [scheduleInfoVisible, setScheduleInfoVisible] = useState(false);
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);

  // Recurring schedule feature
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringValue, setRecurringValue] = useState<string>('1');
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>('hours');
  const [recurringUnitModalVisible, setRecurringUnitModalVisible] = useState(false);
  const [recurrenceInfoVisible, setRecurrenceInfoVisible] = useState(false);

  // Define loadInstalledApps before the useEffect that uses it
  // Uses global cache to avoid reloading apps on every modal open
  const loadInstalledApps = useCallback(async (presetMode?: 'all' | 'specific') => {
    // iOS uses native FamilyActivityPicker - just get the count
    if (Platform.OS === 'ios') {
      try {
        if (InstalledAppsModule?.getSelectedAppsCount) {
          const count = await InstalledAppsModule.getSelectedAppsCount();
          setIosSelectedAppsCount(count);
        }
      } catch (error) {
        // Failed to get iOS app count
      }
      setLoadingApps(false);
      return;
    }

    // Android: Check if we have cached apps - show them instantly without loading state
    if (cachedInstalledApps) {
      setInstalledApps(cachedInstalledApps);
      // If editing a preset with mode 'all', select all apps
      if (presetMode === 'all' && cachedInstalledApps.length > 0) {
        setSelectedApps(cachedInstalledApps.map(app => app.id));
      }
      return;
    }

    // No cache - show loading and fetch
    setLoadingApps(true);
    try {
      const apps = await loadInstalledAppsOnce();
      setInstalledApps(apps);

      // If editing a preset with mode 'all', select all apps
      if (presetMode === 'all' && apps.length > 0) {
        setSelectedApps(apps.map(app => app.id));
      }
    } catch (error) {
      // Failed to load apps
    } finally {
      setLoadingApps(false);
    }
  }, []);

  // iOS: Open native FamilyActivityPicker
  const openIOSAppPicker = useCallback(async () => {
    if (Platform.OS !== 'ios' || !InstalledAppsModule?.showAppPicker) return;

    try {
      lightTap();
      const result = await InstalledAppsModule.showAppPicker();
      if (result?.success) {
        setIosSelectedAppsCount(result.appCount || 0);
      }
    } catch (error) {
      // User cancelled or error occurred
    }
  }, []);

  // Initialize from preset when opened
  useEffect(() => {
    if (visible) {
      if (preset) {
        setName(preset.name);
        setBlockedWebsites(preset.blockedWebsites);
        setBlockSettings(preset.blockSettings);
        setNoTimeLimit(preset.noTimeLimit);
        setTimerDays(preset.timerDays);
        setTimerHours(preset.timerHours);
        setTimerMinutes(preset.timerMinutes);
        setTimerSeconds(preset.timerSeconds ?? 0);
        setTargetDate(preset.targetDate ? new Date(preset.targetDate) : null);
        // Emergency tapout feature
        setAllowEmergencyTapout(preset.allowEmergencyTapout ?? false);
        // Strict mode feature - default to false for existing presets without the field
        setStrictMode(preset.strictMode ?? false);
        // Scheduling feature
        setIsScheduled(preset.isScheduled ?? false);
        setScheduleStartDate(preset.scheduleStartDate ? new Date(preset.scheduleStartDate) : null);
        setScheduleEndDate(preset.scheduleEndDate ? new Date(preset.scheduleEndDate) : null);
        // Recurring schedule feature
        setIsRecurring(preset.repeat_enabled ?? false);
        setRecurringValue(preset.repeat_interval?.toString() ?? '1');
        setRecurringUnit(preset.repeat_unit ?? 'hours');
        // For 'all' mode presets, we'll select all apps after loading
        // For 'specific' mode, use the existing selectedApps
        if (preset.mode === 'all') {
          // Will be populated after loadInstalledApps
          setSelectedApps([]);
        } else {
          setSelectedApps(preset.selectedApps);
        }
      } else {
        // New preset defaults
        setName('');
        setSelectedApps([]);
        setBlockedWebsites([]);
        setBlockSettings(false);
        setNoTimeLimit(true);
        setTimerDays(0);
        setTimerHours(0);
        setTimerMinutes(0);
        setTimerSeconds(0);
        setTargetDate(null);
        // Emergency tapout feature - enabled by default for safety
        setAllowEmergencyTapout(true);
        // Strict mode - disabled by default (slide-to-unlock available)
        setStrictMode(false);
        // Scheduling feature
        setIsScheduled(false);
        setScheduleStartDate(null);
        setScheduleEndDate(null);
      }
      setActiveTab('apps');
      setDisplayedTab('apps');
      setDisplayedStep('first');
      loadInstalledApps(preset?.mode);
      // Check if we should show excluded apps info modal
      AsyncStorage.getItem(EXCLUDED_APPS_INFO_DISMISSED_KEY).then((dismissed) => {
        if (dismissed !== 'true') {
          setExcludedAppsInfoVisible(true);
        }
      });
    }
  }, [visible, preset, loadInstalledApps]);

  const toggleApp = useCallback((appId: string) => {
    lightTap();
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  }, []);

  const addWebsite = useCallback(() => {
    const trimmed = websiteInput.trim().toLowerCase();
    if (trimmed && !blockedWebsites.includes(trimmed)) {
      // Basic validation
      if (trimmed.includes('.')) {
        lightTap();
        setBlockedWebsites(prev => [...prev, trimmed]);
        setWebsiteInput('');
      }
    }
  }, [websiteInput, blockedWebsites]);

  const removeWebsite = useCallback((site: string) => {
    lightTap();
    setBlockedWebsites(prev => prev.filter(s => s !== site));
  }, []);

  // Filter selectedApps to only count apps that are still installed
  const installedSelectedApps = useMemo(() => {
    const installedIds = new Set(installedApps.map(app => app.id));
    return selectedApps.filter(id => installedIds.has(id));
  }, [selectedApps, installedApps]);

  // Check if preset can proceed (has name and at least one installed app or website)
  const canContinue = useMemo(() => {
    const hasApps = Platform.OS === 'ios'
      ? iosSelectedAppsCount > 0
      : installedSelectedApps.length > 0;
    return name.trim() && (hasApps || blockedWebsites.length > 0);
  }, [name, installedSelectedApps.length, blockedWebsites.length, iosSelectedAppsCount]);

  // Check if timer has any value set (not all zeros)
  const hasTimerValue = useMemo(() =>
    timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0,
    [timerDays, timerHours, timerMinutes, timerSeconds]
  );

  // Check if a target date is set
  const hasTargetDate = useMemo(() => targetDate !== null, [targetDate]);

  // Check if scheduled dates are valid
  const hasValidSchedule = useMemo(() =>
    isScheduled &&
    scheduleStartDate !== null &&
    scheduleEndDate !== null &&
    scheduleEndDate > scheduleStartDate,
    [isScheduled, scheduleStartDate, scheduleEndDate]
  );

  // Can save if noTimeLimit is on, OR if timer has a value, OR if target date is set, OR if scheduled with valid dates
  const canSave = useMemo(() =>
    noTimeLimit || hasTimerValue || hasTargetDate || hasValidSchedule,
    [noTimeLimit, hasTimerValue, hasTargetDate, hasValidSchedule]
  );

  const handleContinue = useCallback(() => {
    if (!canContinue) {
      return;
    }
    lightTap();
    goToStep(true);
  }, [canContinue, goToStep]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || isSaving || !canSave) return;
    lightTap();

    // Check for duplicate preset name (case-insensitive)
    const trimmedName = name.trim().toLowerCase();
    const duplicateExists = existingPresets.some(
      p => p.name.toLowerCase() === trimmedName && p.id !== preset?.id
    );

    if (duplicateExists) {
      setDuplicateNameModalVisible(true);
      return;
    }

    setIsSaving(true);

    // Parse recurring value, default to 1 if empty/invalid
    const parsedRecurringValue = parseInt(recurringValue, 10);
    const finalRecurringInterval = isNaN(parsedRecurringValue) || parsedRecurringValue <= 0 ? 1 : parsedRecurringValue;

    const newPreset: Preset = {
      id: preset?.id || '',
      name: name.trim(),
      mode: installedSelectedApps.length === 0 && blockedWebsites.length === 0 ? 'all' : 'specific',
      selectedApps: installedSelectedApps, // Only save apps that are still installed
      blockedWebsites,
      blockSettings,
      noTimeLimit, // Can be true even for scheduled presets
      timerDays,
      timerHours,
      timerMinutes,
      timerSeconds,
      targetDate: isScheduled ? null : (targetDate ? targetDate.toISOString() : null),
      isDefault: preset?.isDefault ?? false,
      isActive: preset?.isActive ?? false,
      // Emergency tapout feature
      allowEmergencyTapout,
      // Strict mode feature
      strictMode,
      // Scheduling feature
      isScheduled,
      scheduleStartDate: isScheduled && scheduleStartDate ? scheduleStartDate.toISOString() : null,
      scheduleEndDate: isScheduled && scheduleEndDate ? scheduleEndDate.toISOString() : null,
      // Recurring schedule feature (only enabled if scheduled and recurring toggle is on)
      repeat_enabled: isScheduled && isRecurring ? true : false,
      repeat_unit: isScheduled && isRecurring ? recurringUnit : undefined,
      repeat_interval: isScheduled && isRecurring ? finalRecurringInterval : undefined,
    };

    try {
      await onSave(newPreset);
    } finally {
      setIsSaving(false);
    }
  }, [name, isSaving, canSave, preset, installedSelectedApps, blockedWebsites, blockSettings, noTimeLimit, timerDays, timerHours, timerMinutes, timerSeconds, targetDate, onSave, allowEmergencyTapout, strictMode, isScheduled, scheduleStartDate, scheduleEndDate, existingPresets, isRecurring, recurringValue, recurringUnit]);

  // Calculate next recurring occurrence based on your specified logic:
  // - Minutes/Hours: Add interval to END time → new START = END + interval, new END = new START + duration
  // - Days/Weeks/Months: Add interval to START date (same time slot on different day)
  const getNextRecurringOccurrence = useCallback(() => {
    if (!scheduleStartDate || !scheduleEndDate || !isRecurring) return null;

    const parsedValue = parseInt(recurringValue, 10);
    const value = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue;

    const duration = scheduleEndDate.getTime() - scheduleStartDate.getTime();

    if (recurringUnit === 'minutes' || recurringUnit === 'hours') {
      // Add interval to END time to get new START, then add duration to get new END
      // Example: 4:32-4:36 + 2 min → new start = 4:36 + 2 = 4:38, new end = 4:38 + 4 = 4:42
      const intervalMs = recurringUnit === 'minutes'
        ? value * 60 * 1000
        : value * 60 * 60 * 1000;

      const newStartTime = scheduleEndDate.getTime() + intervalMs;
      const nextStart = new Date(newStartTime);
      const nextEnd = new Date(newStartTime + duration);

      return { start: nextStart, end: nextEnd };
    } else {
      // Add interval to START date (days/weeks/months) - same time slot, different day
      const nextStart = new Date(scheduleStartDate);
      const nextEnd = new Date(scheduleEndDate);

      if (recurringUnit === 'days') {
        nextStart.setDate(nextStart.getDate() + value);
        nextEnd.setDate(nextEnd.getDate() + value);
      } else if (recurringUnit === 'weeks') {
        nextStart.setDate(nextStart.getDate() + (value * 7));
        nextEnd.setDate(nextEnd.getDate() + (value * 7));
      } else if (recurringUnit === 'months') {
        nextStart.setMonth(nextStart.getMonth() + value);
        nextEnd.setMonth(nextEnd.getMonth() + value);
      }

      return { start: nextStart, end: nextEnd };
    }
  }, [scheduleStartDate, scheduleEndDate, isRecurring, recurringValue, recurringUnit]);

  // Memoize filtered apps to avoid recalculation on every render
  const filteredApps = useMemo(() =>
    installedApps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [installedApps, searchQuery]
  );

  const renderAppItem = useCallback(({ item }: { item: InstalledApp }) => {
    const isSelected = selectedApps.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleApp(item.id)}
        activeOpacity={0.7}
        style={{ backgroundColor: colors.card }}
        className="flex-row items-center py-3 px-4 rounded-xl mb-2"
      >
        {/* App Icon */}
        <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-full items-center justify-center mr-3 overflow-hidden">
          {item.icon ? (
            <Image
              source={{ uri: item.icon }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: colors.textSecondary }} className="text-lg font-nunito-bold">
              {item.name.charAt(0)}
            </Text>
          )}
        </View>

        {/* App Name */}
        <Text style={{ color: colors.text }} className="flex-1 text-base font-nunito">{item.name}</Text>

        {/* Checkbox with checkmark */}
        <View style={isSelected ? { backgroundColor: '#4ade80' } : { borderWidth: 2, borderColor: colors.border }} className="w-6 h-6 rounded items-center justify-center">
          {isSelected && (
            <View className="w-2.5 h-4 border-r-2 border-b-2 border-white rotate-45 -mt-1" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selectedApps, toggleApp, colors]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const ListHeaderComponent = useMemo(() =>
    installedSelectedApps.length > 0 ? (
      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-3">
        {installedSelectedApps.length} app{installedSelectedApps.length !== 1 ? 's' : ''} selected
      </Text>
    ) : null,
    [installedSelectedApps.length, colors]
  );

  if (displayedStep === 'final') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <Animated.View style={{ flex: 1, opacity: stepFadeAnim }}>
            {/* Header */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
              <TouchableOpacity onPress={() => { lightTap(); goToStep(false); }} disabled={isSaving} className="px-2">
                <Text style={{ color: isSaving ? '#FFFFFF' : '#FFFFFF' }} className="text-base font-nunito">Back</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Final Settings</Text>
              <TouchableOpacity onPress={handleSave} disabled={isSaving || !canSave} className="px-2 min-w-[50px] items-end justify-center" style={{ height: 24 }}>
                {isSaving ? (
                  <Lottie
                    source={require('../frontassets/Insider-loading.json')}
                    autoPlay
                    loop
                    speed={2}
                    style={{ width: 90, height: 90, position: 'absolute', right: -25, top: -33 }}
                  />
                ) : (
                  <Text style={{ color: canSave ? '#FFFFFF' : colors.textMuted }} className="text-base font-nunito-semibold">Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
              {/* Guide Button */}
              <View className="items-center mb-6">
                <TouchableOpacity
                  onPress={() => {
                    lightTap();
                    setGuideModalVisible(true);
                  }}
                  activeOpacity={0.8}
                  style={{ backgroundColor: colors.card }}
                  className="px-6 py-3 rounded-full"
                >
                  <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito-semibold">View Preset Guide</Text>
                </TouchableOpacity>
              </View>

            {/* No Time Limit Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
              <View>
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">No Time Limit</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Block until manually unlocked</Text>
              </View>
              <LottieToggle
                size="small"
                value={noTimeLimit}
                onValueChange={(value: boolean) => {
                  setNoTimeLimit(value);
                  requestAnimationFrame(() => {
                    if (value) {
                      setIsScheduled(false);
                      setScheduleStartDate(null);
                      setScheduleEndDate(null);
                    }
                    mediumTap();
                  });
                }}
              />
            </View>

            {/* Block Settings Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
              <View>
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Block Settings App</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">WiFi settings remain accessible</Text>
              </View>
              <LottieToggle
                size="small"
                value={blockSettings}
                onValueChange={async (value: boolean) => {
                  mediumTap();
                  if (value) {
                    // Enabling - check if we should show warning
                    const dismissed = await AsyncStorage.getItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY);
                    if (dismissed !== 'true') {
                      setBlockSettingsWarningVisible(true);
                    } else {
                      setBlockSettings(true);
                    }
                  } else {
                    // Disabling - just disable
                    setBlockSettings(false);
                  }
                }}
              />
            </View>

            {/* Strict Mode Toggle - only for timed presets (hidden when No Time Limit is on) */}
            {!noTimeLimit && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Strict Mode</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Lock until timer ends or emergency tapout</Text>
                </View>
                <LottieToggle
                  size="small"
                  value={strictMode}
                  onValueChange={async (value: boolean) => {
                    mediumTap();
                    if (value) {
                      // Enabling strict mode - check if we should show warning
                      const dismissed = await AsyncStorage.getItem(STRICT_MODE_WARNING_DISMISSED_KEY);
                      if (dismissed !== 'true') {
                        setStrictModeWarningVisible(true);
                      } else {
                        setStrictMode(true);
                        // Auto-enable emergency tapout only if user has tapouts remaining
                        setAllowEmergencyTapout(false); // Default to off first
                        if (email) {
                          try {
                            const status = await getEmergencyTapoutStatus(email);
                            if (status.remaining > 0) {
                              setAllowEmergencyTapout(true);
                            }
                          } catch (error) {
                            // Failed to check - keep off
                          }
                        }
                      }
                    } else {
                      // Disabling strict mode - also disable emergency tapout since it's not relevant
                      setStrictMode(false);
                      setAllowEmergencyTapout(false);
                    }
                  }}
                />
              </View>
            )}

            {/* Emergency Tapout Toggle - only available when Strict Mode is ON (hidden when No Time Limit or Strict Mode is off) */}
            {!noTimeLimit && strictMode && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Allow Emergency Tapout</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Use your emergency tapouts for this preset</Text>
                </View>
                <LottieToggle
                  size="small"
                  value={allowEmergencyTapout}
                  onValueChange={handleEmergencyTapoutToggle}
                />
              </View>
            )}

            {/* Schedule for Later Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Schedule for Later</Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Set a future start and end time</Text>
              </View>
              <LottieToggle
                size="small"
                value={isScheduled}
                onValueChange={(value: boolean) => {
                  // Update visibility state immediately
                  setIsScheduled(value);
                  // Defer other state updates to allow render
                  requestAnimationFrame(() => {
                    if (value) {
                      setNoTimeLimit(false);
                      setTimerDays(0);
                      setTimerHours(0);
                      setTimerMinutes(0);
                      setTimerSeconds(0);
                      setTargetDate(null);
                      mediumTap();
                      AsyncStorage.getItem(SCHEDULE_INFO_DISMISSED_KEY).then(dismissed => {
                        if (dismissed !== 'true') {
                          setScheduleInfoVisible(true);
                        }
                      });
                    } else {
                      setScheduleStartDate(null);
                      setScheduleEndDate(null);
                      mediumTap();
                    }
                  });
                }}
              />
            </View>

            {/* Schedule Date Pickers */}
            {isScheduled && (
              <View className="mt-4">
                <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-4">
                  Schedule
                </Text>

                {/* Start Date */}
                <TouchableOpacity
                  onPress={() => { lightTap(); setStartDatePickerVisible(true); }}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card }}
                  className="flex-row items-center py-3 px-4 rounded-xl mb-3"
                >
                  <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <CalendarIcon size={22} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                      {scheduleStartDate ? 'Start Date' : 'Pick Start Date'}
                    </Text>
                    {scheduleStartDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                        {scheduleStartDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} at {scheduleStartDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    )}
                  </View>
                  {scheduleStartDate ? (
                    <TouchableOpacity
                      onPress={() => { lightTap(); setScheduleStartDate(null); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-lg">✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <ChevronRightIcon size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* End Date */}
                <TouchableOpacity
                  onPress={() => { lightTap(); setEndDatePickerVisible(true); }}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card }}
                  className="flex-row items-center py-3 px-4 rounded-xl"
                >
                  <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <FlagIcon size={22} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                      {scheduleEndDate ? 'End Date' : 'Pick End Date'}
                    </Text>
                    {scheduleEndDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                        {scheduleEndDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} at {scheduleEndDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    )}
                  </View>
                  {scheduleEndDate ? (
                    <TouchableOpacity
                      onPress={() => { lightTap(); setScheduleEndDate(null); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-lg">✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <ChevronRightIcon size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Schedule Validation Message */}
                {scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
                  <Text style={{ color: '#FF5C5C' }} className="text-sm font-nunito mt-2">
                    End date must be after start date
                  </Text>
                )}

                {/* Recurring Schedule Toggle */}
                {scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate && (
                  <View className="mt-4">
                    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4">
                      <View className="flex-1">
                        <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Recurring Schedule</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Repeat this block automatically</Text>
                      </View>
                      <LottieToggle
                        size="small"
                        value={isRecurring}
                        onValueChange={(value: boolean) => {
                          setIsRecurring(value);
                          if (value) {
                            mediumTap();
                            AsyncStorage.getItem(RECURRENCE_INFO_DISMISSED_KEY).then(dismissed => {
                              if (dismissed !== 'true') {
                                setRecurrenceInfoVisible(true);
                              }
                            });
                          } else {
                            setRecurringValue('1');
                            setRecurringUnit('hours');
                            mediumTap();
                          }
                        }}
                      />
                    </View>

                    {/* Recurring Options */}
                    {isRecurring && (
                      <View className="mt-4">
                        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-3">
                          Repeat Every
                        </Text>

                        <View className="flex-row items-center">
                          {/* Number Input */}
                          <View
                            style={{ backgroundColor: colors.card }}
                            className="flex-row items-center justify-center py-3 px-4 rounded-xl mr-3"
                          >
                            <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                              <RepeatIcon size={22} />
                            </View>
                            <TextInput
                              style={{ color: colors.text, minWidth: 50, textAlign: 'center' }}
                              className="text-base font-nunito-semibold"
                              value={recurringValue}
                              onChangeText={(text) => {
                                // Only allow numbers
                                const numericValue = text.replace(/[^0-9]/g, '');
                                setRecurringValue(numericValue);
                              }}
                              keyboardType="number-pad"
                              maxLength={3}
                              placeholder="1"
                              placeholderTextColor={colors.textMuted}
                            />
                          </View>

                          {/* Unit Selector */}
                          <TouchableOpacity
                            onPress={() => {
                              lightTap();
                              setRecurringUnitModalVisible(true);
                            }}
                            activeOpacity={0.7}
                            style={{ backgroundColor: colors.card }}
                            className="flex-1 flex-row items-center justify-between h-[4.55rem] py-3 px-4 rounded-xl"
                          >
                            <Text style={{ color: colors.text }} className="text-base font-nunito-semibold capitalize">
                              {recurringUnit}
                            </Text>
                            <ChevronRightIcon size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>

                        {/* Next Occurrence Preview */}
                        {(() => {
                          const nextOccurrence = getNextRecurringOccurrence();
                          if (!nextOccurrence) return null;

                          const isSameDay = nextOccurrence.start.toDateString() === scheduleStartDate?.toDateString();

                          return (
                            <View style={{ backgroundColor: colors.cardLight }} className="mt-4 p-4 rounded-xl">
                              <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-2">
                                Next Occurrence
                              </Text>
                              <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                                {isSameDay ? (
                                  // Same day - just show times
                                  `${nextOccurrence.start.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })} - ${nextOccurrence.end.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}`
                                ) : (
                                  // Different day - show full date and times
                                  `${nextOccurrence.start.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })} at ${nextOccurrence.start.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}`
                                )}
                              </Text>
                              {!isSameDay && (
                                <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-1">
                                  to {nextOccurrence.end.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })} at {nextOccurrence.end.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </Text>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Timer Picker (if time limit enabled and not scheduled) */}
            {!noTimeLimit && !isScheduled && (
              <View className="mt-6">
                <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-4">
                  Duration
                </Text>
                <TimerPicker
                  days={timerDays}
                  hours={timerHours}
                  minutes={timerMinutes}
                  seconds={timerSeconds}
                  onDaysChange={(val) => {
                    setTimerDays(val);
                    if (val > 0) setTargetDate(null);
                  }}
                  onHoursChange={(val) => {
                    setTimerHours(val);
                    if (val > 0) setTargetDate(null);
                  }}
                  onMinutesChange={(val) => {
                    setTimerMinutes(val);
                    if (val > 0) setTargetDate(null);
                  }}
                  onSecondsChange={(val) => {
                    setTimerSeconds(val);
                    if (val > 0) setTargetDate(null);
                  }}
                />

                {/* Or Pick a Date Divider */}
                <View className="flex-row items-center my-6">
                  <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito px-4">or</Text>
                  <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
                </View>

                {/* Pick a Date Button */}
                <TouchableOpacity
                  onPress={() => {
                    lightTap();
                    // Reset timer when opening date picker
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                    setDatePickerVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card }}
                  className="flex-row items-center py-3 px-4 rounded-xl"
                >
                  <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <CalendarIcon size={22} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                      {targetDate ? 'Change Date' : 'Pick a Date'}
                    </Text>
                    {targetDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                        Until {targetDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} at {targetDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    )}
                  </View>
                  {targetDate ? (
                    <TouchableOpacity
                      onPress={() => { lightTap(); setTargetDate(null); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-lg">✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <ChevronRightIcon size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={datePickerVisible}
            selectedDate={targetDate}
            onClose={() => setDatePickerVisible(false)}
            onSelect={(date) => {
              setTargetDate(date);
              if (date) {
                setTimerDays(0);
                setTimerHours(0);
                setTimerMinutes(0);
                setTimerSeconds(0);
              }
            }}
          />

          {/* Schedule Start Date Picker */}
          <DatePickerModal
            visible={startDatePickerVisible}
            selectedDate={scheduleStartDate}
            onClose={() => setStartDatePickerVisible(false)}
            onSelect={(date) => {
              setScheduleStartDate(date);
              // If end date is before new start date, clear it
              if (date && scheduleEndDate && scheduleEndDate <= date) {
                setScheduleEndDate(null);
              }
            }}
          />

          {/* Schedule End Date Picker */}
          <DatePickerModal
            visible={endDatePickerVisible}
            selectedDate={scheduleEndDate}
            onClose={() => setEndDatePickerVisible(false)}
            minimumDate={scheduleStartDate} // End date must be after start date
            onSelect={(date) => {
              setScheduleEndDate(date);
            }}
          />

          {/* Schedule Info Modal */}
          <ScheduleInfoModal
            visible={scheduleInfoVisible}
            onClose={async (dontShowAgain) => {
              setScheduleInfoVisible(false);
              if (dontShowAgain) {
                await AsyncStorage.setItem(SCHEDULE_INFO_DISMISSED_KEY, 'true');
              }
            }}
          />

          {/* Recurrence Info Modal */}
          <RecurrenceInfoModal
            visible={recurrenceInfoVisible}
            onClose={async (dontShowAgain) => {
              setRecurrenceInfoVisible(false);
              if (dontShowAgain) {
                await AsyncStorage.setItem(RECURRENCE_INFO_DISMISSED_KEY, 'true');
              }
            }}
          />

          {/* Recurring Unit Selection Modal */}
          <Modal
            visible={recurringUnitModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setRecurringUnitModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setRecurringUnitModalVisible(false)}
              className="flex-1 bg-black/70 justify-center items-center px-6"
            >
              <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
                <View className="p-4">
                  <Text style={{ color: colors.text }} className="text-lg font-nunito-bold text-center mb-4">
                    Select Unit
                  </Text>
                  {(['minutes', 'hours', 'days', 'weeks', 'months'] as RecurringUnit[]).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => {
                        setRecurringUnit(unit);
                        setRecurringUnitModalVisible(false);
                        lightTap();
                      }}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: recurringUnit === unit ? "#4ade80" : colors.cardLight,
                      }}
                      className="flex-row items-center justify-between py-4 px-4 rounded-xl mb-2"
                    >
                      <Text
                        style={{ color: recurringUnit === unit ? colors.text : colors.text }}
                        className="text-base font-nunito-semibold capitalize"
                      >
                        {unit}
                      </Text>
                      {recurringUnit === unit && (
                        <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: "#4ade80" }}>
                          <View className="w-3 h-5 border-r-2 border-b-2 border-white rotate-45 -mt-0.5" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          </Animated.View>

          {/* No Tapouts Remaining Modal */}
          <InfoModal
            visible={noTapoutsModalVisible}
            title="No Tapouts Remaining"
            message="You have no emergency tapouts remaining. You cannot enable this feature until you have tapouts available."
            onClose={() => setNoTapoutsModalVisible(false)}
          />

          {/* Duplicate Name Modal */}
          <InfoModal
            visible={duplicateNameModalVisible}
            title="Preset Exists"
            message="A preset with the same name already exists. Please choose a different name."
            onClose={() => setDuplicateNameModalVisible(false)}
          />

          {/* Disable Tapout Warning Modal */}
          <DisableTapoutWarningModal
            visible={disableTapoutWarningVisible}
            onConfirm={async (dontShowAgain) => {
              setDisableTapoutWarningVisible(false);
              setAllowEmergencyTapout(false);
              if (dontShowAgain) {
                await AsyncStorage.setItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY, 'true');
              }
            }}
            onCancel={() => setDisableTapoutWarningVisible(false)}
          />

          {/* Block Settings Warning Modal */}
          <BlockSettingsWarningModal
            visible={blockSettingsWarningVisible}
            onConfirm={async (dontShowAgain) => {
              setBlockSettingsWarningVisible(false);
              setBlockSettings(true);
              if (dontShowAgain) {
                await AsyncStorage.setItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY, 'true');
              }
            }}
            onCancel={() => setBlockSettingsWarningVisible(false)}
          />

          {/* Strict Mode Warning Modal */}
          <StrictModeWarningModal
            visible={strictModeWarningVisible}
            onConfirm={async (dontShowAgain) => {
              setStrictModeWarningVisible(false);
              setStrictMode(true);
              // Auto-enable emergency tapout only if user has tapouts remaining
              setAllowEmergencyTapout(false); // Default to off first
              if (email) {
                try {
                  const status = await getEmergencyTapoutStatus(email);
                  if (status.remaining > 0) {
                    setAllowEmergencyTapout(true);
                  }
                } catch (error) {
                  // Failed to check - keep off
                }
              }
              if (dontShowAgain) {
                await AsyncStorage.setItem(STRICT_MODE_WARNING_DISMISSED_KEY, 'true');
              }
            }}
            onCancel={() => setStrictModeWarningVisible(false)}
          />

          {/* Preset Guide Modal */}
          <PresetGuideModal
            visible={guideModalVisible}
            onClose={() => setGuideModalVisible(false)}
          />

        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View style={{ flex: 1, opacity: stepFadeAnim }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => { lightTap(); onClose(); }} className="px-2">
              <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito">Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">
              {preset ? 'Edit Preset' : 'New Preset'}
            </Text>
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!canContinue}
              className="px-2"
            >
              <Text style={{ color: canContinue ? '#FFFFFF' : colors.textMuted }} className="text-base font-nunito-semibold">
                Next
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
          {/* Preset Name Input */}
          <View className="px-6 py-4">
            <TextInput
              placeholder="Preset Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={15}
              style={{ backgroundColor: colors.card, color: colors.text }}
              className="rounded-xl px-4 py-3 text-base font-nunito-semibold"
            />
          </View>

          {/* Tabs */}
          <View className="flex-row mx-6 mb-4">
            <TouchableOpacity
              onPress={() => { lightTap(); switchTab('apps'); }}
              style={{ backgroundColor: activeTab === 'apps' ? colors.text : colors.card }}
              className="flex-1 py-2 rounded-full items-center"
            >
              <Text style={{ color: activeTab === 'apps' ? colors.bg : colors.text }} className="text-base font-nunito-semibold">
                Apps
              </Text>
            </TouchableOpacity>
            <View className="w-2" />
            <TouchableOpacity
              onPress={() => { lightTap(); switchTab('websites'); }}
              style={{ backgroundColor: activeTab === 'websites' ? colors.text : colors.card }}
              className="flex-1 py-2 rounded-full items-center"
            >
              <Text style={{ color: activeTab === 'websites' ? colors.bg : colors.text }} className="text-base font-nunito-semibold">
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
                    style={{ backgroundColor: colors.card }}
                    className="flex-row items-center py-4 px-4 rounded-xl mb-4"
                  >
                    <View style={{ backgroundColor: colors.cardLight }} className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                      <AppsIcon size={24} color={colors.text} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                        Select Apps to Block
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                        {iosSelectedAppsCount > 0
                          ? `${iosSelectedAppsCount} app${iosSelectedAppsCount !== 1 ? 's' : ''} selected`
                          : 'Tap to choose apps'}
                      </Text>
                    </View>
                    <ChevronRightIcon size={24} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Text style={{ color: colors.textMuted }} className="text-sm font-nunito text-center px-4">
                    iOS uses Screen Time to block apps. Tap above to open the app picker.
                  </Text>
                </View>
              ) : (
              // Android: Show searchable list of apps
              <>
                {/* Search */}
                <View className="px-6 mb-4">
                  <TextInput
                    placeholder="Search apps..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ backgroundColor: colors.card, color: colors.text }}
                    className="rounded-xl px-4 py-3 text-base font-nunito-semibold"
                  />
                </View>

                {/* Select All / Deselect All Buttons */}
                {!loadingApps && filteredApps.length > 0 && (
                  <View className="flex-row px-6 mb-3">
                    <TouchableOpacity
                      onPress={() => {
                        lightTap();
                        // Select all currently filtered apps
                        const filteredIds = filteredApps.map(app => app.id);
                        setSelectedApps(prev => {
                          const newSet = new Set(prev);
                          filteredIds.forEach(id => newSet.add(id));
                          return Array.from(newSet);
                        });
                      }}
                      style={{ backgroundColor: colors.card }}
                      className="flex-1 py-2 rounded-xl items-center mr-2"
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">
                        Select All
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        lightTap();
                        // Deselect all currently filtered apps
                        const filteredIds = new Set(filteredApps.map(app => app.id));
                        setSelectedApps(prev => prev.filter(id => !filteredIds.has(id)));
                      }}
                      style={{ backgroundColor: colors.card }}
                      className="flex-1 py-2 rounded-xl items-center"
                    >
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito-semibold">
                        Deselect All
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Apps List */}
                {loadingApps ? (
                  <View className="flex-1 items-center justify-center">
                    <Lottie
                      source={require('../frontassets/Insider-loading.json')}
                      autoPlay
                      loop
                      speed={2}
                      style={{ width: 150, height: 150 }}
                    />
                  </View>
                ) : (
                  <FlatList
                    data={filteredApps}
                    renderItem={renderAppItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
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
                  <TextInput
                    placeholder="e.g. instagram.com"
                    placeholderTextColor={colors.textMuted}
                    value={websiteInput}
                    onChangeText={setWebsiteInput}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      backgroundColor: colors.card,
                      color: colors.text,
                      textAlignVertical: 'center',
                      includeFontPadding: false,
                      paddingVertical: 0,
                    }}
                    className="flex-1 rounded-xl px-4 h-12 text-base font-nunito-semibold mr-2"
                  />
                  <TouchableOpacity
                    onPress={addWebsite}
                    style={{ backgroundColor: colors.card }}
                    className="w-11 h-11 rounded-full items-center justify-center"
                  >
                    <Text className="text-white text-2xl font-nunito-light">+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: colors.textMuted }} className="text-xs font-nunito mb-4">
                  Enter URLs like: instagram.com, reddit.com, etc
                </Text>

                {/* Website List */}
                {blockedWebsites.map((site) => (
                  <View
                    key={site}
                    style={{ backgroundColor: colors.card }}
                    className="flex-row items-center py-3 px-4 rounded-xl mb-2"
                  >
                    <View style={{ backgroundColor: colors.cardLight }} className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                      <Text style={{ color: colors.textSecondary }} className="text-lg font-nunito-bold">
                        {site.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text }} className="flex-1 text-base font-nunito">{site}</Text>
                    <TouchableOpacity
                      onPress={() => removeWebsite(site)}
                      className="p-2"
                    >
                      <Text style={{ color: "#FFFFFF" }} className="text-lg">✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {blockedWebsites.length === 0 && (
                  <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito py-8">
                    No websites blocked yet
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
        </Animated.View>

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
    </Modal>
  );
}

export default memo(PresetEditModal);
