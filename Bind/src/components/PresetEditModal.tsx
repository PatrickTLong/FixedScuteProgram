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
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import AnimatedSwitch from './AnimatedSwitch';
import AnimatedCheckbox from './AnimatedCheckbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';
import TimerPicker from './TimerPicker';
import ScheduleInfoModal from './ScheduleInfoModal';
import InfoModal from './InfoModal';
import ExcludedAppsInfoModal from './ExcludedAppsInfoModal';
import DisableTapoutWarningModal from './DisableTapoutWarningModal';
import BlockSettingsWarningModal from './BlockSettingsWarningModal';
import RecurrenceInfoModal from './RecurrenceInfoModal';
import StrictModeWarningModal from './StrictModeWarningModal';
import { Preset } from './PresetCard';
import { getEmergencyTapoutStatus, setEmergencyTapoutEnabled } from '../services/cardApi';
import { lightTap, mediumTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const SCHEDULE_INFO_DISMISSED_KEY = 'schedule_info_dismissed';
const EXCLUDED_APPS_INFO_DISMISSED_KEY = 'excluded_apps_info_dismissed';
const DISABLE_TAPOUT_WARNING_DISMISSED_KEY = 'disable_tapout_warning_dismissed';
const BLOCK_SETTINGS_WARNING_DISMISSED_KEY = 'block_settings_warning_dismissed';
const RECURRENCE_INFO_DISMISSED_KEY = 'recurrence_info_dismissed';
const STRICT_MODE_WARNING_DISMISSED_KEY = 'strict_mode_warning_dismissed';

// Recurring schedule unit types
type RecurringUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

// ============ Date Picker Constants & Components ============
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Time picker constants
const BASE_TIME_ITEM_HEIGHT = 40;
const TIME_VISIBLE_ITEMS = 3;
const TIME_WINDOW_BUFFER = 2;
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// Time Wheel Component
interface TimeWheelProps {
  values: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  padZero?: boolean;
  textColor: string;
  textMutedColor: string;
  itemHeight: number;
  wheelWidth: number;
  selectedFontSize: number;
  unselectedFontSize: number;
}

const TimeWheel = memo(({ values, selectedValue, onValueChange, padZero = true, textColor, textMutedColor, itemHeight, wheelWidth, selectedFontSize, unselectedFontSize }: TimeWheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastHapticIndex = useRef(-1);
  const windowCenterRef = useRef(values.indexOf(selectedValue));
  const [windowRange, setWindowRange] = useState(() => {
    const idx = values.indexOf(selectedValue);
    return { start: Math.max(0, idx - TIME_WINDOW_BUFFER), end: Math.min(values.length - 1, idx + TIME_WINDOW_BUFFER) };
  });

  const windowedValues = useMemo(
    () => values.slice(windowRange.start, windowRange.end + 1),
    [values, windowRange.start, windowRange.end],
  );

  const topSpacerHeight = windowRange.start * itemHeight;
  const bottomSpacerHeight = (values.length - 1 - windowRange.end) * itemHeight;

  const updateWindowIfNeeded = useCallback((index: number) => {
    windowCenterRef.current = index;
    setWindowRange(prev => {
      if (index <= prev.start || index >= prev.end) {
        const newStart = Math.max(0, index - TIME_WINDOW_BUFFER);
        const newEnd = Math.min(values.length - 1, index + TIME_WINDOW_BUFFER);
        if (newStart !== prev.start || newEnd !== prev.end) {
          return { start: newStart, end: newEnd };
        }
      }
      return prev;
    });
  }, [values.length]);

  useEffect(() => {
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      updateWindowIfNeeded(index);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: index * itemHeight,
          animated: false,
        });
      }, 10);
    }
  }, [selectedValue, values, itemHeight, updateWindowIfNeeded]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;

    updateWindowIfNeeded(clampedIndex);
  }, [values.length, itemHeight, updateWindowIfNeeded]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    updateWindowIfNeeded(clampedIndex);

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }

    scrollRef.current?.scrollTo({
      y: clampedIndex * itemHeight,
      animated: true,
    });
  }, [values, selectedValue, onValueChange, itemHeight, updateWindowIfNeeded]);

  const paddingVertical = (itemHeight * (TIME_VISIBLE_ITEMS - 1)) / 2;

  return (
    <View style={{ height: itemHeight * TIME_VISIBLE_ITEMS, width: wheelWidth, overflow: 'hidden' }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={(e) => {
          if (e.nativeEvent.velocity?.y === 0) {
            handleScrollEnd(e);
          }
        }}
        contentContainerStyle={{ paddingVertical }}
        nestedScrollEnabled={false}
        overScrollMode="never"
      >
        {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
        {windowedValues.map((value) => {
          const isSelected = value === selectedValue;
          return (
            <View
              key={value}
              style={{
                height: itemHeight,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: isSelected ? selectedFontSize : unselectedFontSize,
                  fontFamily: isSelected ? 'Nunito-Bold' : 'Nunito-Regular',
                  color: isSelected ? textColor : textMutedColor,
                }}
              >
                {padZero ? String(value).padStart(2, '0') : value}
              </Text>
            </View>
          );
        })}
        {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
      </ScrollView>
    </View>
  );
});

// Memoized Day Cell
interface DayCellProps {
  day: number;
  selectable: boolean;
  selected: boolean;
  isToday: boolean;
  textColor: string;
  textMutedColor: string;
  onSelect: (day: number) => void;
  cellHeight: number;
}

const DayCell = memo(({ day, selectable, selected, isToday: todayDay, textColor, textMutedColor, onSelect, cellHeight }: DayCellProps) => (
  <TouchableOpacity
    onPress={() => onSelect(day)}
    disabled={!selectable}
    style={{ width: '14.28%', height: cellHeight }}
    className="items-center justify-center"
  >
    <View
      style={{
        backgroundColor: selected ? '#22c55e' : 'transparent',
        borderColor: todayDay && !selected ? '#22c55e' : 'transparent',
        borderWidth: todayDay && !selected ? 1 : 0,
      }}
      className="w-9 h-9 rounded-full items-center justify-center"
    >
      <Text
        style={{
          color: selected ? '#FFFFFF' : selectable ? textColor : textMutedColor,
        }}
        className={`text-base font-nunito ${selected ? 'font-nunito-bold' : ''}`}
      >
        {day}
      </Text>
    </View>
  </TouchableOpacity>
));

const EmptyCell = memo(({ cellHeight }: { cellHeight: number }) => (
  <View style={{ width: '14.28%', height: cellHeight }} />
));

// AM/PM Selector
interface AmPmSelectorProps {
  value: 'AM' | 'PM';
  onChange: (value: 'AM' | 'PM') => void;
  cardColor: string;
  textMutedColor: string;
}

const AmPmSelector = memo(({ value, onChange, cardColor, textMutedColor }: AmPmSelectorProps) => (
  <View className="ml-2">
    <TouchableOpacity
      onPress={() => { lightTap(); onChange('AM'); }}
      style={{ backgroundColor: value === 'AM' ? '#22c55e' : cardColor }}
      className="px-3 py-2 rounded-lg"
    >
      <Text style={{ color: value === 'AM' ? '#FFFFFF' : textMutedColor }} className="text-base font-nunito-semibold">
        AM
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { lightTap(); onChange('PM'); }}
      style={{ backgroundColor: value === 'PM' ? '#22c55e' : cardColor }}
      className="px-3 py-2 rounded-lg mt-1"
    >
      <Text style={{ color: value === 'PM' ? '#FFFFFF' : textMutedColor }} className="text-base font-nunito-semibold">
        PM
      </Text>
    </TouchableOpacity>
  </View>
));

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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// System apps excluded from app selection
const EXCLUDED_PACKAGES = [
  'com.scuteapp',                   // Scute (this app)
  'com.android.settings',           // Settings (has its own toggle)
  'com.android.dialer',             // Phone/Dialer
  'com.google.android.dialer',      // Google Phone
  'com.samsung.android.dialer',     // Samsung Phone
  'com.android.phone',              // Phone
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
      // Filter out system apps (phone, emergency, settings)
      // Also filter out apps named "All Apps" which is a system/launcher component
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

// Expandable info wrapper
// lazy=false (default): always rendered, toggles visibility — fast for lightweight content
// lazy=true: mounts/unmounts children — use for heavy components (TimerPicker, date pickers)
const ExpandableInfo = ({ expanded, children, lazy = false }: { expanded: boolean; children: React.ReactNode; lazy?: boolean }) => {
  if (lazy && !expanded) return null;

  if (!expanded) return null;

  return (
    <View>
      {children}
    </View>
  );
};


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
      d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Android icon for Apps tab
const AndroidIcon = ({ size = 18, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"
      fill={color}
    />
  </Svg>
);

// Send icon (Feather send) - for next occurrence
const SendIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Repeat/Recurrence icon - white with thicker strokes
const RotateCwIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 15a9 9 0 11-2.12-9.36L23 10"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Clock icon for recurring unit selector
const ClockIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2a10 10 0 100 20 10 10 0 000-20z"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 6v6l4 2"
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
  const { s } = useResponsive();
  const timeItemHeight = s(BASE_TIME_ITEM_HEIGHT);
  const wheelWidth = s(50);
  const timeSelectedFontSize = s(24);
  const timeUnselectedFontSize = s(18);
  const dayCellHeight = s(44);
  const [name, setName] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [skipCheckboxAnimation, setSkipCheckboxAnimation] = useState(false);
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
  const [displayedStep, setDisplayedStep] = useState<'first' | 'final' | 'datePicker'>('first');
  // Track which date picker is being shown and where to return to
  const [datePickerTarget, setDatePickerTarget] = useState<'targetDate' | 'scheduleStart' | 'scheduleEnd' | null>(null);
  // Date picker inline state
  const [dpViewMonth, setDpViewMonth] = useState(new Date().getMonth());
  const [dpViewYear, setDpViewYear] = useState(new Date().getFullYear());
  const [dpTempSelectedDate, setDpTempSelectedDate] = useState<Date | null>(null);
  const [dpSelectedHour, setDpSelectedHour] = useState(12);
  const [dpSelectedMinute, setDpSelectedMinute] = useState(0);
  const [dpSelectedAmPm, setDpSelectedAmPm] = useState<'AM' | 'PM'>('PM');
  // iOS-specific: track selected app count from native picker
  const [iosSelectedAppsCount, setIosSelectedAppsCount] = useState(0);

  // Ref for final-step ScrollView to disable scrolling over timer picker
  const finalScrollRef = useRef<ScrollView>(null);

  // Step transition animation (same pattern as App.tsx tab transitions)
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const isStepTransitioning = useRef(false);

  // Step transition (first step <-> final step <-> datePicker)
  const goToStep = useCallback((step: 'first' | 'final' | 'datePicker') => {
    if (isStepTransitioning.current) return;
    isStepTransitioning.current = true;

    // Fade out
    Animated.timing(stepFadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // Swap step while invisible
      setDisplayedStep(step);
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

  // Expandable info dropdowns for each toggle
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const toggleInfo = useCallback((key: string) => {
    lightTap();
    setExpandedInfo(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  // Recurring schedule feature
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringValue, setRecurringValue] = useState<string>('1');
  const [recurringUnit, setRecurringUnit] = useState<RecurringUnit>('hours');
  const [recurringUnitModalVisible, setRecurringUnitModalVisible] = useState(false);
  const [recurrenceInfoVisible, setRecurrenceInfoVisible] = useState(false);

  // ============ Inline Date Picker Logic ============
  const dpToday = useMemo(() => new Date(), []);
  const dpMaxDate = useMemo(() => {
    const max = new Date(dpToday);
    max.setFullYear(max.getFullYear() + 1);
    return max;
  }, [dpToday]);

  // Effective minimum date based on target type
  const dpEffectiveMinDate = useMemo(() => {
    if (datePickerTarget === 'scheduleEnd' && scheduleStartDate) {
      return scheduleStartDate > dpToday ? scheduleStartDate : dpToday;
    }
    return dpToday;
  }, [datePickerTarget, scheduleStartDate, dpToday]);

  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const dpHandlePrevMonth = useCallback(() => {
    lightTap();
    if (dpViewMonth === 0) {
      setDpViewMonth(11);
      setDpViewYear(y => y - 1);
    } else {
      setDpViewMonth(m => m - 1);
    }
  }, [dpViewMonth]);

  const dpHandleNextMonth = useCallback(() => {
    lightTap();
    if (dpViewMonth === 11) {
      setDpViewMonth(0);
      setDpViewYear(y => y + 1);
    } else {
      setDpViewMonth(m => m + 1);
    }
  }, [dpViewMonth]);

  const dpCanGoPrev = useMemo(() => {
    const prevDate = new Date(dpViewYear, dpViewMonth - 1, 1);
    return prevDate >= new Date(dpEffectiveMinDate.getFullYear(), dpEffectiveMinDate.getMonth(), 1);
  }, [dpViewYear, dpViewMonth, dpEffectiveMinDate]);

  const dpCanGoNext = useMemo(() => {
    const nextDate = new Date(dpViewYear, dpViewMonth + 1, 1);
    return nextDate <= dpMaxDate;
  }, [dpViewYear, dpViewMonth, dpMaxDate]);

  const dpHandleSelectDay = useCallback((day: number) => {
    lightTap();
    const selected = new Date(dpViewYear, dpViewMonth, day);
    setDpTempSelectedDate(selected);
  }, [dpViewYear, dpViewMonth]);

  // Check if selected datetime is valid (after minimum date and in the future)
  const dpIsFutureDateTime = useMemo(() => {
    if (!dpTempSelectedDate) return false;

    let hours24 = dpSelectedHour;
    if (dpSelectedAmPm === 'PM' && dpSelectedHour !== 12) {
      hours24 = dpSelectedHour + 12;
    } else if (dpSelectedAmPm === 'AM' && dpSelectedHour === 12) {
      hours24 = 0;
    }

    const selectedDateTime = new Date(
      dpTempSelectedDate.getFullYear(),
      dpTempSelectedDate.getMonth(),
      dpTempSelectedDate.getDate(),
      hours24,
      dpSelectedMinute,
      0
    );

    const now = new Date();
    return selectedDateTime > now && selectedDateTime > dpEffectiveMinDate;
  }, [dpTempSelectedDate, dpSelectedHour, dpSelectedMinute, dpSelectedAmPm, dpEffectiveMinDate]);

  // Open date picker for a specific target
  const openDatePicker = useCallback((target: 'targetDate' | 'scheduleStart' | 'scheduleEnd') => {
    lightTap();
    setDatePickerTarget(target);

    // Get existing date for this target
    let existingDate: Date | null = null;
    if (target === 'targetDate') existingDate = targetDate;
    else if (target === 'scheduleStart') existingDate = scheduleStartDate;
    else if (target === 'scheduleEnd') existingDate = scheduleEndDate;

    const dateToUse = existingDate || dpToday;
    setDpViewMonth(dateToUse.getMonth());
    setDpViewYear(dateToUse.getFullYear());
    setDpTempSelectedDate(existingDate);

    // Initialize time from existing date
    if (existingDate) {
      const hours = existingDate.getHours();
      const minutes = existingDate.getMinutes();
      setDpSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
      setDpSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
      setDpSelectedMinute(minutes);
    } else {
      const now = new Date();
      const hours = now.getHours();
      setDpSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
      setDpSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
      setDpSelectedMinute(now.getMinutes());
    }

    goToStep('datePicker');
  }, [targetDate, scheduleStartDate, scheduleEndDate, dpToday, goToStep]);

  const dpHandleConfirm = useCallback(() => {
    if (dpTempSelectedDate && dpIsFutureDateTime) {
      lightTap();
      let hours24 = dpSelectedHour;
      if (dpSelectedAmPm === 'PM' && dpSelectedHour !== 12) {
        hours24 = dpSelectedHour + 12;
      } else if (dpSelectedAmPm === 'AM' && dpSelectedHour === 12) {
        hours24 = 0;
      }

      const finalDate = new Date(
        dpTempSelectedDate.getFullYear(),
        dpTempSelectedDate.getMonth(),
        dpTempSelectedDate.getDate(),
        hours24,
        dpSelectedMinute,
        0
      );

      // Set the appropriate date based on target
      if (datePickerTarget === 'targetDate') {
        setTargetDate(finalDate);
        setTimerDays(0);
        setTimerHours(0);
        setTimerMinutes(0);
        setTimerSeconds(0);
      } else if (datePickerTarget === 'scheduleStart') {
        setScheduleStartDate(finalDate);
        // If end date is before new start date, clear it
        if (scheduleEndDate && scheduleEndDate <= finalDate) {
          setScheduleEndDate(null);
        }
      } else if (datePickerTarget === 'scheduleEnd') {
        setScheduleEndDate(finalDate);
      }

      goToStep('final');
    }
  }, [dpTempSelectedDate, dpIsFutureDateTime, dpSelectedHour, dpSelectedAmPm, dpSelectedMinute, datePickerTarget, scheduleEndDate, goToStep]);

  const dpHandleCancel = useCallback(() => {
    lightTap();
    goToStep('final');
  }, [goToStep]);

  const dpHandleClear = useCallback(() => {
    lightTap();
    setDpTempSelectedDate(null);
  }, []);

  const dpDaysInMonth = getDaysInMonth(dpViewMonth, dpViewYear);
  const dpFirstDay = getFirstDayOfMonth(dpViewMonth, dpViewYear);

  // Build calendar grid
  const dpCalendarDays = useMemo(() => {
    const days: ({ type: 'empty' } | { type: 'day'; day: number; selectable: boolean; selected: boolean; isToday: boolean })[] = [];
    for (let i = 0; i < dpFirstDay; i++) {
      days.push({ type: 'empty' });
    }
    const todayDate = dpToday.getDate();
    const todayMonth = dpToday.getMonth();
    const todayYear = dpToday.getFullYear();
    const selectedDay = dpTempSelectedDate?.getDate();
    const selectedMonth = dpTempSelectedDate?.getMonth();
    const selectedYear = dpTempSelectedDate?.getFullYear();

    for (let i = 1; i <= dpDaysInMonth; i++) {
      const date = new Date(dpViewYear, dpViewMonth, i, 23, 59, 59, 999);
      days.push({
        type: 'day',
        day: i,
        selectable: date >= dpEffectiveMinDate && date <= dpMaxDate,
        selected: selectedDay === i && selectedMonth === dpViewMonth && selectedYear === dpViewYear,
        isToday: todayDate === i && todayMonth === dpViewMonth && todayYear === dpViewYear,
      });
    }
    return days;
  }, [dpDaysInMonth, dpFirstDay, dpViewMonth, dpViewYear, dpTempSelectedDate, dpEffectiveMinDate, dpMaxDate, dpToday]);

  // Format selected date and time for display
  const dpSelectedDateTimeText = useMemo(() => {
    if (!dpTempSelectedDate) return 'No date selected';
    const dateStr = dpTempSelectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = `${dpSelectedHour}:${String(dpSelectedMinute).padStart(2, '0')} ${dpSelectedAmPm}`;
    return `${dateStr} at ${timeStr}`;
  }, [dpTempSelectedDate, dpSelectedHour, dpSelectedMinute, dpSelectedAmPm]);

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
      setLoadingApps(false); // Ensure loading is false when using cache
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
    goToStep('final');
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
        {/* App Icon - native already provides squircle shape */}
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

        {/* App Name */}
        <Text style={{ color: colors.text }} className="flex-1 text-base font-nunito">{item.name}</Text>

        {/* Animated Checkbox */}
        <AnimatedCheckbox checked={isSelected} size={s(24)} skipAnimation={skipCheckboxAnimation} />
      </TouchableOpacity>
    );
  }, [selectedApps, toggleApp, colors, skipCheckboxAnimation]);

  const keyExtractor = useCallback((item: InstalledApp) => item.id, []);

  const ListHeaderComponent = useMemo(() =>
    installedSelectedApps.length > 0 ? (
      <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-3">
        {installedSelectedApps.length} app{installedSelectedApps.length !== 1 ? 's' : ''} selected
      </Text>
    ) : null,
    [installedSelectedApps.length, colors]
  );

  // ============ Date Picker Step ============
  if (displayedStep === 'datePicker') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <Animated.View style={{ flex: 1, opacity: stepFadeAnim }}>
            {/* Header */}
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
              <TouchableOpacity onPress={dpHandleCancel} className="px-2">
                <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito">Cancel</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Pick Date and Time</Text>
              <TouchableOpacity
                onPress={dpHandleConfirm}
                disabled={!dpIsFutureDateTime}
                className="px-2"
              >
                <Text style={{ color: dpIsFutureDateTime ? '#FFFFFF' : colors.textMuted }} className="text-base font-nunito-semibold">
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <View
              className="flex-1"
              style={{ paddingTop: s(16), paddingBottom: s(40), paddingHorizontal: s(24) }}
            >
              {/* Month/Year Navigation */}
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={dpHandlePrevMonth}
                  disabled={!dpCanGoPrev}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Text style={{ color: dpCanGoPrev ? colors.text : colors.textMuted }} className="text-2xl">
                    ‹
                  </Text>
                </TouchableOpacity>

                <Text style={{ color: colors.text }} className="text-xl font-nunito-semibold">
                  {MONTHS[dpViewMonth]} {dpViewYear}
                </Text>

                <TouchableOpacity
                  onPress={dpHandleNextMonth}
                  disabled={!dpCanGoNext}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Text style={{ color: dpCanGoNext ? colors.text : colors.textMuted }} className="text-2xl">
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Days of Week Header */}
              <View className="flex-row mb-1">
                {DAYS_OF_WEEK.map((day) => (
                  <View key={day} className="flex-1 items-center py-1">
                    <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View className="flex-row flex-wrap">
                {dpCalendarDays.map((cell, index) => {
                  if (cell.type === 'empty') {
                    return <EmptyCell key={`empty-${index}`} cellHeight={dayCellHeight} />;
                  }
                  return (
                    <DayCell
                      key={cell.day}
                      day={cell.day}
                      selectable={cell.selectable}
                      selected={cell.selected}
                      isToday={cell.isToday}
                      textColor={colors.text}
                      textMutedColor={colors.textMuted}
                      onSelect={dpHandleSelectDay}
                      cellHeight={dayCellHeight}
                    />
                  );
                })}
              </View>

              {/* Time Picker */}
              {dpTempSelectedDate && (
                <View style={{ borderTopColor: colors.border, marginHorizontal: s(-24), paddingHorizontal: s(24) }} className="mt-6 pt-4 pb-4 border-t">
                  <Text style={{ color: colors.textMuted }} className="text-xs font-nunito tracking-wider mb-3">
                    Time
                  </Text>
                  <View className="flex-row items-center justify-center">
                    <TimeWheel
                      values={HOURS_12}
                      selectedValue={dpSelectedHour}
                      onValueChange={setDpSelectedHour}
                      padZero={false}
                      textColor={colors.text}
                      textMutedColor={colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)'}
                      itemHeight={timeItemHeight}
                      wheelWidth={wheelWidth}
                      selectedFontSize={timeSelectedFontSize}
                      unselectedFontSize={timeUnselectedFontSize}
                    />
                    <View style={{ height: timeItemHeight, justifyContent: 'center', marginHorizontal: s(4), marginTop: -timeItemHeight * 0.15 }}>
                      <Text style={{ color: colors.textMuted, fontSize: s(24) }}>:</Text>
                    </View>
                    <TimeWheel
                      values={MINUTES}
                      selectedValue={dpSelectedMinute}
                      onValueChange={setDpSelectedMinute}
                      padZero={true}
                      textColor={colors.text}
                      textMutedColor={colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)'}
                      itemHeight={timeItemHeight}
                      wheelWidth={wheelWidth}
                      selectedFontSize={timeSelectedFontSize}
                      unselectedFontSize={timeUnselectedFontSize}
                    />
                    <AmPmSelector
                      value={dpSelectedAmPm}
                      onChange={setDpSelectedAmPm}
                      cardColor={colors.card}
                      textMutedColor={colors.textSecondary}
                    />
                  </View>
                </View>
              )}

              {/* Selected Date/Time Display */}
              <View style={{ borderTopColor: colors.border, marginHorizontal: s(-24), paddingHorizontal: s(24) }} className="mt-6 py-4 border-t">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text style={{ color: colors.text }} className="text-base font-nunito mb-1">Selected</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito-semibold">{dpSelectedDateTimeText}</Text>
                  </View>
                  {dpTempSelectedDate && (
                    <TouchableOpacity
                      onPress={dpHandleClear}
                      style={{ backgroundColor: colors.card }}
                      className="ml-4 px-4 py-2 rounded-full"
                    >
                      <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {dpTempSelectedDate && !dpIsFutureDateTime && (
                  <Text style={{ color: '#FF5C5C' }} className="text-xs font-nunito mt-2">
                    Please select a future date and time
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    );
  }

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
              <TouchableOpacity onPress={() => { lightTap(); goToStep('first'); }} disabled={isSaving} className="px-2">
                <Text style={{ color: isSaving ? '#FFFFFF' : '#FFFFFF' }} className="text-base font-nunito">Back</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Final Settings</Text>
              <TouchableOpacity onPress={handleSave} disabled={isSaving || !canSave} className="px-2 min-w-[50px] items-end justify-center" style={{ height: s(24), overflow: 'visible' }}>
                <Text style={{ color: canSave ? '#FFFFFF' : colors.textMuted, opacity: isSaving ? 0 : 1 }} className="text-base font-nunito-semibold">Save</Text>
                {isSaving && (
                  <View style={{ position: 'absolute', top: s(-63), right: s(-50), width: s(150), height: s(150), justifyContent: 'center', alignItems: 'center' }}>
                    <Lottie
                      source={require('../frontassets/Loading Dots Blue.json')}
                      autoPlay
                      loop
                      speed={2}
                      style={{ width: s(150), height: s(150) }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView ref={finalScrollRef} className="flex-1 pt-6" contentContainerStyle={{ paddingBottom: s(100) }}>

            <Text style={{ color: '#FFFFFF' }} className="text-xs font-nunito px-6 mb-4">
              Tap on toggle text to see further details
            </Text>

            {/* ── Time & Duration ── */}

            {/* No Time Limit Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                <TouchableOpacity onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">No Time Limit</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">Block until manually unlocked</Text>
                </TouchableOpacity>
                <AnimatedSwitch
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
              <ExpandableInfo expanded={!!expandedInfo.noTimeLimit}>
                <TouchableOpacity onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} className="px-6 pb-4">
                  <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                    Block stays active until manually ended for No Time Limit Presets. Strict Mode for this toggle ONLY disables tap to continue functionality.
                  </Text>
                </TouchableOpacity>
              </ExpandableInfo>
            </View>

            {/* Schedule for Later Toggle */}
            <ExpandableInfo expanded={!noTimeLimit} lazy>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Schedule for Later</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">Set a future start and end time</Text>
                </TouchableOpacity>
                <AnimatedSwitch
                  value={isScheduled}
                  onValueChange={(value: boolean) => {
                    setIsScheduled(value);
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
              <ExpandableInfo expanded={!!expandedInfo.schedule}>
                <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} className="px-6 pb-4">
                  <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                    Set a future start and end time. Hides timer options since duration is determined by your schedule.
                  </Text>
                </TouchableOpacity>
              </ExpandableInfo>
            </View>
            </ExpandableInfo>

            {/* Schedule Date Pickers */}
            <ExpandableInfo expanded={isScheduled} lazy>
              <View className="mt-4 px-6">
                <Text style={{ color: colors.textMuted }} className="text-xs font-nunito text-white tracking-wider mb-4">
                  Schedule
                </Text>

                {/* Start Date */}
                <TouchableOpacity
                  onPress={() => openDatePicker('scheduleStart')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card, paddingVertical: s(14) }}
                  className="flex-row items-center px-4 rounded-xl mb-3"
                >
                  <View  className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <CalendarIcon size={s(26)} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                      {scheduleStartDate ? 'Start Date' : 'Pick Start Date'}
                    </Text>
                    {scheduleStartDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">
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
                    <ChevronRightIcon size={s(20)} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* End Date */}
                <TouchableOpacity
                  onPress={() => openDatePicker('scheduleEnd')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card, paddingVertical: s(14) }}
                  className="flex-row items-center px-4 rounded-xl"
                >
                  <View  className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <FlagIcon size={s(26)} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                      {scheduleEndDate ? 'End Date' : 'Pick End Date'}
                    </Text>
                    {scheduleEndDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">
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
                    <ChevronRightIcon size={s(20)} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Schedule Validation Message */}
                {scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
                  <Text style={{ color: '#FF5C5C' }} className="text-sm font-nunito mt-2">
                    End date must be after start date
                  </Text>
                )}

                {/* Divider when recurring schedule is not available */}
                <ExpandableInfo expanded={!(scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate)}>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: s(20), marginHorizontal: s(-24) }} />
                </ExpandableInfo>

                {/* Recurring Schedule Toggle */}
                <ExpandableInfo expanded={!!(scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate)} lazy>
                  <View className="-mx-6">
                    <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                      <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                        <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Recurring Schedule</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">Repeat this block automatically</Text>
                      </TouchableOpacity>
                      <AnimatedSwitch
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
                    <ExpandableInfo expanded={!!expandedInfo.recurring}>
                      <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} className="px-6 pb-4">
                        <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                          Automatically repeats this blocking session at the interval you choose. After each session ends, the next one will start based on your selected frequency.
                        </Text>
                      </TouchableOpacity>
                    </ExpandableInfo>
                    {(isRecurring || !!expandedInfo.recurring) && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} />
                    )}

                    {/* Recurring Options */}
                    <ExpandableInfo expanded={isRecurring} lazy>
                      <View className="mt-4 px-6">
                        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito tracking-wider mb-4">
                          Recurrence
                        </Text>

                        {/* Number Input */}
                        <View
                          style={{ backgroundColor: colors.card, paddingVertical: s(14) }}
                          className="flex-row items-center px-4 rounded-xl mb-3"
                        >
                          <View className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                            <RotateCwIcon size={s(26)} />
                          </View>
                          <View className="flex-1">
                            <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                              Repeat Every
                            </Text>
                          </View>
                          <TextInput
                            style={{ color: colors.text, minWidth: s(40), textAlign: 'center', height: s(28), padding: 0 }}
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
                          style={{ backgroundColor: colors.card, paddingVertical: s(14) }}
                          className="flex-row items-center px-4 rounded-xl mb-3"
                        >
                          <View className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                            <ClockIcon size={s(26)} />
                          </View>
                          <View className="flex-1">
                            <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold capitalize">
                              {recurringUnit}
                            </Text>
                          </View>
                          <ChevronRightIcon size={s(20)} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Next Occurrence Preview */}
                        {(() => {
                          const nextOccurrence = getNextRecurringOccurrence();
                          if (!nextOccurrence) return null;

                          const isSameDay = nextOccurrence.start.toDateString() === nextOccurrence.end.toDateString();

                          return (
                            <View style={{ backgroundColor: colors.card, paddingVertical: s(14) }} className="flex-row items-center px-4 rounded-xl">
                              <View className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                                <SendIcon size={s(26)} />
                              </View>
                              <View className="flex-1">
                                <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                                  Next Occurrence
                                </Text>
                                <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">
                                  {`${nextOccurrence.start.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })} ${nextOccurrence.start.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })} - ${isSameDay ? '' : nextOccurrence.end.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  }) + ' '}${nextOccurrence.end.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}`}
                                </Text>
                              </View>
                            </View>
                          );
                        })()}
                      </View>
                    </ExpandableInfo>
                  </View>
                  <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: isRecurring ? s(16) : 0, marginHorizontal: s(-24) }} />
                </ExpandableInfo>
              </View>
            </ExpandableInfo>

            {/* Timer Picker (if time limit enabled and not scheduled) */}
            <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
              <View className="mt-6 px-6">
                <View
                  onTouchStart={() => finalScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                  onTouchEnd={() => finalScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                  onTouchCancel={() => finalScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                >
                  <Text style={{ color: colors.textMuted }} className="text-xs font-nunito text-white tracking-wider">
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
                </View>

                {/* Or Pick a Date Divider */}
                <View className="flex-row items-center my-6 -mx-6">
                  <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
                  <Text style={{ color: colors.textMuted }} className="text-xs font-nunito px-4">or</Text>
                  <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
                </View>

                {/* Pick a Date Button */}
                <TouchableOpacity
                  onPress={() => {
                    // Reset timer when opening date picker
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                    openDatePicker('targetDate');
                  }}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card, paddingVertical: s(14) }}
                  className="flex-row items-center px-4 rounded-xl"
                >
                  <View className="w-10 h-10 rounded-lg items-center justify-center mr-3">
                    <CalendarIcon size={s(26)} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                      {targetDate ? 'Change Date' : 'Pick a Date'}
                    </Text>
                    {targetDate && (
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">
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
                    <ChevronRightIcon size={s(20)} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: s(16) }} />
            </ExpandableInfo>

            {/* ── Block Behavior ── */}

            {/* Block Settings Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                <TouchableOpacity onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Block Settings App</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">WiFi settings remain accessible</Text>
                </TouchableOpacity>
                <AnimatedSwitch
                  value={blockSettings}
                  onValueChange={async (value: boolean) => {
                    mediumTap();
                    if (value) {
                      const dismissed = await AsyncStorage.getItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY);
                      if (dismissed !== 'true') {
                        setBlockSettingsWarningVisible(true);
                      } else {
                        setBlockSettings(true);
                      }
                    } else {
                      setBlockSettings(false);
                    }
                  }}
                />
              </View>
              <ExpandableInfo expanded={!!expandedInfo.blockSettings}>
                <TouchableOpacity onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} className="px-6 pb-4">
                  <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                    Prevents access to Android Settings during the block so that overlays and essential permissions cannot be disabled. Most essential settings like WiFi or battery settings remain accessible via quick panel by sliding down from your phone.
                  </Text>
                </TouchableOpacity>
              </ExpandableInfo>
            </View>

            {/* Strict Mode Toggle */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                <TouchableOpacity onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                  <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Strict Mode</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">
                    {noTimeLimit ? 'Disable "Continue anyway" button for blocked apps' : 'Lock until timer ends or emergency tapout'}
                  </Text>
                </TouchableOpacity>
                <AnimatedSwitch
                  value={strictMode}
                  onValueChange={async (value: boolean) => {
                    mediumTap();
                    if (value) {
                      const dismissed = await AsyncStorage.getItem(STRICT_MODE_WARNING_DISMISSED_KEY);
                      if (dismissed !== 'true') {
                        setStrictModeWarningVisible(true);
                      } else {
                        setStrictMode(true);
                        setAllowEmergencyTapout(false);
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
                      setStrictMode(false);
                      setAllowEmergencyTapout(false);
                    }
                  }}
                />
              </View>
              <ExpandableInfo expanded={!!expandedInfo.strictMode}>
                <TouchableOpacity onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} className="px-6 pb-4">
                  <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                    Removes the ability to unlock in any way and to dismiss blocked apps or sites. ONLY EXITS: timer expiring or Emergency Tapout (if enabled). Pair with the block settings toggle for maximum strictness.
                  </Text>
                </TouchableOpacity>
              </ExpandableInfo>
            </View>

            {/* Emergency Tapout Toggle */}
            <ExpandableInfo expanded={strictMode} lazy>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ paddingVertical: s(20) }} className="flex-row items-center justify-between px-6">
                  <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                    <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">Allow Emergency Tapout</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">Use your emergency tapouts for this preset</Text>
                  </TouchableOpacity>
                  <AnimatedSwitch
                    value={allowEmergencyTapout}
                    onValueChange={handleEmergencyTapoutToggle}
                  />
                </View>
                <ExpandableInfo expanded={!!expandedInfo.emergencyTapout}>
                  <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} className="px-6 pb-4">
                    <Text style={{ color: colors.text }} className="text-sm font-nunito leading-5">
                      Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
                    </Text>
                  </TouchableOpacity>
                </ExpandableInfo>
              </View>
            </ExpandableInfo>

          </ScrollView>

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
                        backgroundColor: recurringUnit === unit ? '#22c55e' : colors.cardLight,
                      }}
                      className="items-center justify-center py-4 px-4 rounded-xl mb-2"
                    >
                      <Text
                        style={{ color: recurringUnit === unit ? '#FFFFFF' : colors.text }}
                        className="text-sm font-nunito-semibold capitalize"
                      >
                        {unit}
                      </Text>
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
              maxLength={20}
              style={{ backgroundColor: colors.card, color: colors.text }}
              className="rounded-xl px-4 py-3 text-sm font-nunito-semibold"
            />
          </View>

          {/* Tabs */}
          <View className="flex-row mx-6 mb-4">
            <TouchableOpacity
              onPress={() => { lightTap(); switchTab('apps'); }}
              style={{ backgroundColor: activeTab === 'apps' ? colors.text : colors.card }}
              className="flex-1 py-2 rounded-full items-center justify-center flex-row"
            >
              <AndroidIcon size={s(16)} color={activeTab === 'apps' ? colors.bg : colors.text} />
              <Text style={{ color: activeTab === 'apps' ? colors.bg : colors.text, marginLeft: 6 }} className="text-sm font-nunito-semibold">
                Apps
              </Text>
            </TouchableOpacity>
            <View className="w-2" />
            <TouchableOpacity
              onPress={() => { lightTap(); switchTab('websites'); }}
              style={{ backgroundColor: activeTab === 'websites' ? colors.text : colors.card }}
              className="flex-1 py-3 rounded-full items-center justify-center flex-row"
            >
              <GlobeIcon size={s(16)} color={activeTab === 'websites' ? colors.bg : colors.text} />
              <Text style={{ color: activeTab === 'websites' ? colors.bg : colors.text, marginLeft: 6 }} className="text-sm font-nunito-semibold">
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
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                      <AppsIcon size={s(26)} color={colors.text} />
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
                    <ChevronRightIcon size={s(24)} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Text style={{ color: colors.textMuted }} className="text-sm font-nunito text-center px-4">
                    iOS uses Screen Time to block apps. Tap above to open the app picker.
                  </Text>
                </View>
              ) : (
              // Android: Show searchable list of apps
              <>
                {/* Search */}
                <View className="px-6  mb-4">
                  <TextInput
                    placeholder="Search apps..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ backgroundColor: colors.card, color: colors.text }}
                    className="rounded-xl px-4 py-3 text-sm font-nunito-semibold"
                  />
                </View>

                {/* Select All / Deselect All Buttons */}
                {!loadingApps && filteredApps.length > 0 && (
                  <View className="flex-row px-6 mb-3">
                    <TouchableOpacity
                      onPress={() => {
                        lightTap();
                        // Always skip animation for bulk select
                        setSkipCheckboxAnimation(true);
                        setTimeout(() => setSkipCheckboxAnimation(false), 50);
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
                        // Always skip animation for bulk deselect
                        setSkipCheckboxAnimation(true);
                        setTimeout(() => setSkipCheckboxAnimation(false), 50);
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
                    className="flex-1 rounded-xl px-4 h-12 text-sm  font-nunito-semibold mr-2"
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
                    <View className="w-10 h-10 items-center justify-center mr-3">
                      <GlobeIcon size={s(32)} color={colors.textSecondary} />
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
