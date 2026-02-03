import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import AnimatedSwitch from '../components/AnimatedSwitch';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';
import TimerPicker from '../components/TimerPicker';
import ScheduleInfoModal from '../components/ScheduleInfoModal';
import InfoModal from '../components/InfoModal';
import DisableTapoutWarningModal from '../components/DisableTapoutWarningModal';
import BlockSettingsWarningModal from '../components/BlockSettingsWarningModal';
import RecurrenceInfoModal from '../components/RecurrenceInfoModal';
import StrictModeWarningModal from '../components/StrictModeWarningModal';
import { Preset } from '../components/PresetCard';
import { getEmergencyTapoutStatus } from '../services/cardApi';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap, mediumTap } from '../utils/haptics';
import { usePresetSave } from '../navigation/PresetsStack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { PresetsStackParamList } from '../navigation/types';

// ============ Pure date helpers ============
function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay();
}

// ============ AsyncStorage Keys ============
const SCHEDULE_INFO_DISMISSED_KEY = 'schedule_info_dismissed';
const DISABLE_TAPOUT_WARNING_DISMISSED_KEY = 'disable_tapout_warning_dismissed';
const BLOCK_SETTINGS_WARNING_DISMISSED_KEY = 'block_settings_warning_dismissed';
const RECURRENCE_INFO_DISMISSED_KEY = 'recurrence_info_dismissed';
const STRICT_MODE_WARNING_DISMISSED_KEY = 'strict_mode_warning_dismissed';

// ============ Recurring schedule unit types ============
type RecurringUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

// ============ Icon Components ============
const ChevronLeftIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6 6l12 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FlagIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

const RotateCwIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 15a9 9 0 11-2.12-9.36L23 10"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2a10 10 0 100 20 10 10 0 000-20z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 6v6l4 2"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SendIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ============ Date Picker Constants ============
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BASE_TIME_ITEM_HEIGHT = 40;
const TIME_VISIBLE_ITEMS = 3;
const TIME_WINDOW_BUFFER = 2;
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// ============ TimeWheel Component ============
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

// ============ DayCell Component ============
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

const DayCell = memo(({ day, selectable, selected, isToday: todayDay, textColor, textMutedColor, onSelect, cellHeight }: DayCellProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onSelect(day)}
      disabled={!selectable}
      style={{ width: '14.28%', height: cellHeight }}
      className="items-center justify-center"
    >
      <View
        style={{
          backgroundColor: selected ? colors.green : 'transparent',
          borderColor: todayDay && !selected ? colors.green : 'transparent',
          borderWidth: todayDay && !selected ? 1 : 0,
        }}
        className={`w-9 h-9 ${radius.full} items-center justify-center`}
      >
        <Text
          style={{
            color: selected ? colors.text : selectable ? textColor : textMutedColor,
          }}
          className={`${textSize.base} ${fontFamily.regular} ${selected ? fontFamily.bold : ''}`}
        >
          {day}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const EmptyCell = memo(({ cellHeight }: { cellHeight: number }) => (
  <View style={{ width: '14.28%', height: cellHeight }} />
));

// ============ AmPmSelector Component ============
interface AmPmSelectorProps {
  value: 'AM' | 'PM';
  onChange: (value: 'AM' | 'PM') => void;
  cardColor: string;
}

const AmPmSelector = memo(({ value, onChange, cardColor }: AmPmSelectorProps) => {
  const { colors } = useTheme();
  return (
    <View className="ml-2">
      <TouchableOpacity
        onPress={() => { lightTap(); onChange('AM'); }}
        style={{ backgroundColor: value === 'AM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'AM' ? colors.green : colors.border, ...shadow.card }}
        className={`px-3 py-2 ${radius.AMPM}`}
      >
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
          AM
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { lightTap(); onChange('PM'); }}
        style={{ backgroundColor: value === 'PM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'PM' ? colors.green : colors.border, ...shadow.card }}
        className={`px-3 py-2 ${radius.AMPM} mt-1`}
      >
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
          PM
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ============ ExpandableInfo Component ============
const ExpandableInfo = ({ expanded, children, lazy = false }: { expanded: boolean; children: React.ReactNode; lazy?: boolean }) => {
  if (lazy && !expanded) return null;
  if (!expanded) return null;
  return (
    <View>
      {children}
    </View>
  );
};

// ============ Navigation Types ============
type PresetSettingsNavigationProp = NativeStackNavigationProp<PresetsStackParamList, 'PresetSettings'>;
type PresetSettingsRouteProp = RouteProp<PresetsStackParamList, 'PresetSettings'>;

// ============ Main Screen Component ============
function PresetSettingsScreen() {
  const navigation = useNavigation<PresetSettingsNavigationProp>();
  const route = useRoute<PresetSettingsRouteProp>();
  const { name, selectedApps, blockedWebsites, installedApps, iosSelectedAppsCount } = route.params;
  const { onSave, editingPreset, existingPresets, email } = usePresetSave();
  const { colors } = useTheme();
  const { s } = useResponsive();

  const timeItemHeight = s(BASE_TIME_ITEM_HEIGHT);
  const wheelWidth = s(50);
  const timeSelectedFontSize = s(24);
  const timeUnselectedFontSize = s(18);
  const dayCellHeight = s(44);

  // ============ Toggle/Timer/Schedule State ============
  const [blockSettings, setBlockSettings] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [timerDays, setTimerDays] = useState(0);
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  // Emergency tapout feature
  const [allowEmergencyTapout, setAllowEmergencyTapout] = useState(false);
  const [noTapoutsModalVisible, setNoTapoutsModalVisible] = useState(false);

  // Duplicate name modal
  const [duplicateNameModalVisible, setDuplicateNameModalVisible] = useState(false);

  // Disable tapout warning modal
  const [disableTapoutWarningVisible, setDisableTapoutWarningVisible] = useState(false);

  // Block settings warning modal
  const [blockSettingsWarningVisible, setBlockSettingsWarningVisible] = useState(false);

  // Strict mode feature
  const [strictMode, setStrictMode] = useState(false);
  const [strictModeWarningVisible, setStrictModeWarningVisible] = useState(false);

  // Expandable info dropdowns
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const toggleInfo = useCallback((key: string) => {
    lightTap();
    setExpandedInfo(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  // ============ Inline Date Picker State ============
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'targetDate' | 'scheduleStart' | 'scheduleEnd' | null>(null);
  const [dpViewMonth, setDpViewMonth] = useState(new Date().getMonth());
  const [dpViewYear, setDpViewYear] = useState(new Date().getFullYear());
  const [dpTempSelectedDate, setDpTempSelectedDate] = useState<Date | null>(null);
  const [dpSelectedHour, setDpSelectedHour] = useState(12);
  const [dpSelectedMinute, setDpSelectedMinute] = useState(0);
  const [dpSelectedAmPm, setDpSelectedAmPm] = useState<'AM' | 'PM'>('PM');

  // Refs
  const mainScrollRef = useRef<ScrollView>(null);

  // ============ Initialize from editingPreset on mount ============
  useEffect(() => {
    if (editingPreset) {
      setBlockSettings(editingPreset.blockSettings);
      setNoTimeLimit(editingPreset.noTimeLimit);
      setTimerDays(editingPreset.timerDays);
      setTimerHours(editingPreset.timerHours);
      setTimerMinutes(editingPreset.timerMinutes);
      setTimerSeconds(editingPreset.timerSeconds ?? 0);
      setTargetDate(editingPreset.targetDate ? new Date(editingPreset.targetDate) : null);
      setAllowEmergencyTapout(editingPreset.allowEmergencyTapout ?? false);
      setStrictMode(editingPreset.strictMode ?? false);
      setIsScheduled(editingPreset.isScheduled ?? false);
      setScheduleStartDate(editingPreset.scheduleStartDate ? new Date(editingPreset.scheduleStartDate) : null);
      setScheduleEndDate(editingPreset.scheduleEndDate ? new Date(editingPreset.scheduleEndDate) : null);
      setIsRecurring(editingPreset.repeat_enabled ?? false);
      setRecurringValue(editingPreset.repeat_interval?.toString() ?? '1');
      setRecurringUnit(editingPreset.repeat_unit ?? 'hours');
    } else {
      // New preset defaults
      setBlockSettings(false);
      setNoTimeLimit(false);
      setTimerDays(0);
      setTimerHours(0);
      setTimerMinutes(0);
      setTimerSeconds(0);
      setTargetDate(null);
      setAllowEmergencyTapout(true); // Enabled by default for safety
      setStrictMode(false);
      setIsScheduled(false);
      setScheduleStartDate(null);
      setScheduleEndDate(null);
      setIsRecurring(false);
      setRecurringValue('1');
      setRecurringUnit('hours');
    }
  }, [editingPreset]);

  // ============ Emergency Tapout Handler ============
  const handleEmergencyTapoutToggle = useCallback(async (value: boolean) => {
    mediumTap();

    if (value) {
      setAllowEmergencyTapout(true);
      if (email) {
        try {
          const status = await getEmergencyTapoutStatus(email);
          if (status.remaining <= 0) {
            setAllowEmergencyTapout(false);
            setNoTapoutsModalVisible(true);
          }
        } catch (error) {
          // Failed to check emergency tapout status
        }
      }
    } else {
      const dismissed = await AsyncStorage.getItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY);
      if (dismissed !== 'true') {
        setDisableTapoutWarningVisible(true);
      } else {
        setAllowEmergencyTapout(false);
      }
    }
  }, [email]);

  // ============ Date Picker Logic ============
  const dpToday = useMemo(() => new Date(), []);
  const dpMaxDate = useMemo(() => {
    const max = new Date(dpToday);
    max.setFullYear(max.getFullYear() + 1);
    return max;
  }, [dpToday]);

  const dpEffectiveMinDate = useMemo(() => {
    if (datePickerTarget === 'scheduleEnd' && scheduleStartDate) {
      return scheduleStartDate > dpToday ? scheduleStartDate : dpToday;
    }
    return dpToday;
  }, [datePickerTarget, scheduleStartDate, dpToday]);

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

  // Open date picker inline
  const openDatePicker = useCallback((target: 'targetDate' | 'scheduleStart' | 'scheduleEnd') => {
    lightTap();
    setDatePickerTarget(target);

    let existingDate: Date | null = null;
    if (target === 'targetDate') existingDate = targetDate;
    else if (target === 'scheduleStart') existingDate = scheduleStartDate;
    else if (target === 'scheduleEnd') existingDate = scheduleEndDate;

    const dateToUse = existingDate || dpToday;
    setDpViewMonth(dateToUse.getMonth());
    setDpViewYear(dateToUse.getFullYear());
    setDpTempSelectedDate(existingDate);

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

    setShowDatePicker(true);
  }, [targetDate, scheduleStartDate, scheduleEndDate, dpToday]);

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

      if (datePickerTarget === 'targetDate') {
        setTargetDate(finalDate);
        setTimerDays(0);
        setTimerHours(0);
        setTimerMinutes(0);
        setTimerSeconds(0);
      } else if (datePickerTarget === 'scheduleStart') {
        setScheduleStartDate(finalDate);
        if (scheduleEndDate && scheduleEndDate <= finalDate) {
          setScheduleEndDate(null);
        }
      } else if (datePickerTarget === 'scheduleEnd') {
        setScheduleEndDate(finalDate);
      }

      setShowDatePicker(false);
      setDatePickerTarget(null);
    }
  }, [dpTempSelectedDate, dpIsFutureDateTime, dpSelectedHour, dpSelectedAmPm, dpSelectedMinute, datePickerTarget, scheduleEndDate]);

  const dpHandleCancel = useCallback(() => {
    lightTap();
    setShowDatePicker(false);
    setDatePickerTarget(null);
  }, []);

  const dpHandleClear = useCallback(() => {
    lightTap();
    setDpTempSelectedDate(null);
  }, []);

  const dpDaysInMonth = useMemo(() => getDaysInMonth(dpViewMonth, dpViewYear), [dpViewMonth, dpViewYear]);
  const dpFirstDay = useMemo(() => getFirstDayOfMonth(dpViewMonth, dpViewYear), [dpViewMonth, dpViewYear]);

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

  // ============ Validation Logic ============
  const hasTimerValue = useMemo(() =>
    timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0,
    [timerDays, timerHours, timerMinutes, timerSeconds]
  );

  const hasTargetDate = useMemo(() => targetDate !== null, [targetDate]);

  const hasValidSchedule = useMemo(() =>
    isScheduled &&
    scheduleStartDate !== null &&
    scheduleEndDate !== null &&
    scheduleEndDate > scheduleStartDate,
    [isScheduled, scheduleStartDate, scheduleEndDate]
  );

  const canSave = useMemo(() =>
    noTimeLimit || hasTimerValue || hasTargetDate || hasValidSchedule,
    [noTimeLimit, hasTimerValue, hasTargetDate, hasValidSchedule]
  );

  // Filter selectedApps to only count apps that are still installed
  const installedSelectedApps = useMemo(() => {
    const installedIds = new Set(installedApps.map((app: { id: string; name: string; icon?: string }) => app.id));
    return selectedApps.filter((id: string) => installedIds.has(id));
  }, [selectedApps, installedApps]);

  // ============ Save Handler ============
  const handleSave = useCallback(async () => {
    if (!name.trim() || isSaving || !canSave) return;
    lightTap();

    const trimmedName = name.trim().toLowerCase();
    const duplicateExists = existingPresets.some(
      (p: Preset) => p.name.toLowerCase() === trimmedName && p.id !== editingPreset?.id
    );

    if (duplicateExists) {
      setDuplicateNameModalVisible(true);
      return;
    }

    setIsSaving(true);

    const parsedRecurringValue = parseInt(recurringValue, 10);
    const finalRecurringInterval = isNaN(parsedRecurringValue) || parsedRecurringValue <= 0 ? 1 : parsedRecurringValue;

    const newPreset: Preset = {
      id: editingPreset?.id || '',
      name: name.trim(),
      mode: installedSelectedApps.length === 0 && blockedWebsites.length === 0 ? 'all' : 'specific',
      selectedApps: installedSelectedApps,
      blockedWebsites,
      blockSettings,
      noTimeLimit,
      timerDays,
      timerHours,
      timerMinutes,
      timerSeconds,
      targetDate: isScheduled ? null : (targetDate ? targetDate.toISOString() : null),
      isDefault: editingPreset?.isDefault ?? false,
      isActive: editingPreset?.isActive ?? false,
      allowEmergencyTapout,
      strictMode,
      isScheduled,
      scheduleStartDate: isScheduled && scheduleStartDate ? scheduleStartDate.toISOString() : null,
      scheduleEndDate: isScheduled && scheduleEndDate ? scheduleEndDate.toISOString() : null,
      repeat_enabled: isScheduled && isRecurring ? true : false,
      repeat_unit: isScheduled && isRecurring ? recurringUnit : undefined,
      repeat_interval: isScheduled && isRecurring ? finalRecurringInterval : undefined,
    };

    try {
      await onSave(newPreset);
      navigation.popToTop();
    } finally {
      setIsSaving(false);
    }
  }, [name, isSaving, canSave, editingPreset, installedSelectedApps, blockedWebsites, blockSettings, noTimeLimit, timerDays, timerHours, timerMinutes, timerSeconds, targetDate, onSave, allowEmergencyTapout, strictMode, isScheduled, scheduleStartDate, scheduleEndDate, existingPresets, isRecurring, recurringValue, recurringUnit, navigation]);

  // ============ Inline Date Picker Render ============
  const renderInlineDatePicker = () => {
    if (!showDatePicker) return null;

    return (
      <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight, borderBottomWidth: 1, borderBottomColor: colors.dividerLight, marginHorizontal: s(-24), paddingHorizontal: s(24) }} className="mt-4 pb-4">
        {/* Date Picker Header */}
        <View className="flex-row items-center justify-between py-3">
          <TouchableOpacity onPress={dpHandleCancel} style={{ width: s(40) }} className="px-2">
            <XIcon size={s(iconSize.headerNav)} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
            {datePickerTarget === 'scheduleStart' ? 'Start Date' : datePickerTarget === 'scheduleEnd' ? 'End Date' : 'Date and Time'}
          </Text>
          <TouchableOpacity
            onPress={dpHandleConfirm}
            disabled={!dpIsFutureDateTime}
            style={{ width: s(40) }}
            className="px-2 items-end"
          >
            <CheckIcon size={s(iconSize.headerNav)} color={dpIsFutureDateTime ? colors.green : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Month/Year Navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={dpHandlePrevMonth}
            disabled={!dpCanGoPrev}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronLeftIcon size={s(iconSize.md)} color={dpCanGoPrev ? colors.text : colors.textMuted} />
          </TouchableOpacity>

          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
            {MONTHS[dpViewMonth]} {dpViewYear}
          </Text>

          <TouchableOpacity
            onPress={dpHandleNextMonth}
            disabled={!dpCanGoNext}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronRightIcon size={s(iconSize.md)} color={dpCanGoNext ? colors.text : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Days of Week Header */}
        <View className="flex-row mb-1">
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} className="flex-1 items-center py-1">
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>{day}</Text>
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
          <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight }} className="mt-6 pt-4 pb-4">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-3`}>
              Time
            </Text>
            <View className="flex-row items-center justify-center">
              <View
                onTouchStart={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                onTouchEnd={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                onTouchCancel={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
              >
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
              </View>
              <View style={{ height: timeItemHeight, justifyContent: 'center', marginHorizontal: s(4), marginTop: -timeItemHeight * 0.15 }}>
                <Text style={{ color: colors.textMuted, fontSize: s(24) }}>:</Text>
              </View>
              <View
                onTouchStart={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                onTouchEnd={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
                onTouchCancel={() => mainScrollRef.current?.setNativeProps({ scrollEnabled: true })}
              >
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
              </View>
              <AmPmSelector
                value={dpSelectedAmPm}
                onChange={setDpSelectedAmPm}
                cardColor={colors.card}
              />
            </View>
          </View>
        )}

        {/* Selected Date/Time Display */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight, paddingVertical: s(buttonPadding.standard) }} className="mt-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.regular} mb-1`}>Selected</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>{dpSelectedDateTimeText}</Text>
            </View>
            {dpTempSelectedDate && (
              <TouchableOpacity
                onPress={dpHandleClear}
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                className={`ml-4 px-4 py-2 ${radius.full}`}
              >
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {dpTempSelectedDate && !dpIsFutureDateTime && (
            <Text style={{ color: colors.red }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-2`}>
              Please select a future date and time
            </Text>
          )}
        </View>

        {/* Recurring Schedule - only when picking end date and start date is already set */}
        {datePickerTarget === 'scheduleEnd' && scheduleStartDate && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight }}>
            <View>
              <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between">
                <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Recurring Schedule</Text>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Repeat this block automatically</Text>
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
                <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} className="pb-4">
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                    Automatically repeats this blocking session at the interval you choose. After each session ends, the next one will start based on your selected frequency.
                  </Text>
                </TouchableOpacity>
              </ExpandableInfo>
              {(isRecurring || !!expandedInfo.recurring) && (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} />
              )}

              {/* Recurring Options */}
              <ExpandableInfo expanded={isRecurring} lazy>
                <View className="mt-4 pb-4">
                  <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-4`}>
                    Recurrence
                  </Text>

                  {/* Number Input */}
                  <View
                    style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                    className={`flex-row items-center px-4 ${radius.xl} mb-3`}
                  >
                    <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                      <RotateCwIcon size={s(iconSize.lg)} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                        Repeat Every
                      </Text>
                    </View>
                    <TextInput
                      style={{ color: colors.text, minWidth: s(40), textAlign: 'center', height: s(28), padding: 0 }}
                      className={`${textSize.base} ${fontFamily.semibold}`}
                      value={recurringValue}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, '');
                        setRecurringValue(numericValue);
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="1"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* Unit Selector */}
                  <TouchableOpacity
                    onPress={() => {
                      lightTap();
                      setRecurringUnitModalVisible(true);
                    }}
                    activeOpacity={0.7}
                    style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                    className={`flex-row items-center px-4 ${radius.xl} mb-3`}
                  >
                    <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                      <ClockIcon size={s(iconSize.lg)} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} capitalize`}>
                        {recurringUnit}
                      </Text>
                    </View>
                    <ChevronRightIcon size={s(iconSize.md)} color={colors.text} />
                  </TouchableOpacity>

                  {/* Next Occurrence Preview */}
                  {(() => {
                    if (!dpTempSelectedDate || !scheduleStartDate || !isRecurring) return null;

                    let hours24 = dpSelectedHour % 12;
                    if (dpSelectedAmPm === 'PM') hours24 += 12;
                    if (dpSelectedAmPm === 'AM' && dpSelectedHour === 12) hours24 = 0;
                    const pendingEndDate = new Date(
                      dpTempSelectedDate.getFullYear(),
                      dpTempSelectedDate.getMonth(),
                      dpTempSelectedDate.getDate(),
                      hours24,
                      dpSelectedMinute,
                      0
                    );

                    if (pendingEndDate <= scheduleStartDate) return null;

                    const parsedValue = parseInt(recurringValue, 10);
                    const value = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue;
                    const duration = pendingEndDate.getTime() - scheduleStartDate.getTime();

                    let nextStart: Date;
                    let nextEnd: Date;

                    if (recurringUnit === 'minutes' || recurringUnit === 'hours') {
                      const intervalMs = recurringUnit === 'minutes'
                        ? value * 60 * 1000
                        : value * 60 * 60 * 1000;
                      const newStartTime = pendingEndDate.getTime() + intervalMs;
                      nextStart = new Date(newStartTime);
                      nextEnd = new Date(newStartTime + duration);
                    } else {
                      nextStart = new Date(scheduleStartDate);
                      nextEnd = new Date(pendingEndDate);
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
                    }

                    const isSameDay = nextStart.toDateString() === nextEnd.toDateString();

                    return (
                      <View>
                        <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-1`}>
                          {`Start: ${scheduleStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${scheduleStartDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-3`}>
                          {`End: ${pendingEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${pendingEndDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                        </Text>
                        <View style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`flex-row items-center px-4 ${radius.xl}`}>
                          <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                            <SendIcon size={s(iconSize.lg)} />
                          </View>
                          <View className="flex-1">
                            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                              Next Occurrence
                            </Text>
                            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                              {`e.g. ${nextStart.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })} ${nextStart.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })} - ${isSameDay ? '' : nextEnd.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              }) + ' '}${nextEnd.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </ExpandableInfo>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ============ Render ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} className="flex-row items-center justify-between px-4 py-3.5">
        <TouchableOpacity onPress={() => { lightTap(); navigation.goBack(); }} disabled={isSaving} style={{ width: s(40) }} className="px-2">
          <ChevronLeftIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Final Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving || !canSave} style={{ width: s(40), height: s(24), overflow: 'visible' }} className="px-2 items-end justify-center">
          <View style={{ opacity: isSaving ? 0 : 1 }}>
            <CheckIcon size={s(iconSize.headerNav)} color={canSave ? '#FFFFFF' : colors.textMuted} />
          </View>
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

      <ScrollView ref={mainScrollRef} className="flex-1 pt-6" contentContainerStyle={{ paddingBottom: s(100) }}>

        <Text style={{ color: colors.text }} className={`${textSize.extraSmall} ${fontFamily.regular} px-6 mb-4`}>
          Tap on toggle text to see further details
        </Text>

        {/* ── Time & Duration ── */}

        {/* No Time Limit Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <TouchableOpacity onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>No Time Limit</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Block until manually unlocked</Text>
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
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Block stays active until manually ended for No Time Limit Presets. Strict Mode for this toggle ONLY disables tap to continue functionality.
              </Text>
            </TouchableOpacity>
          </ExpandableInfo>
        </View>

        {/* Schedule for Later Toggle */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Schedule for Later</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Set a future start and end time, with optional recurrence</Text>
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
                      setShowDatePicker(false);
                      setDatePickerTarget(null);
                      mediumTap();
                    }
                  });
                }}
              />
            </View>
            <ExpandableInfo expanded={!!expandedInfo.schedule}>
              <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Set a future start and end time. Hides timer options since duration is determined by your schedule. You can also set up recurring blocks when picking your end date.
                </Text>
              </TouchableOpacity>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* Schedule Date Pickers */}
        <ExpandableInfo expanded={isScheduled} lazy>
          <View className="mt-4 px-6">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-white tracking-wider mb-4`}>
              Schedule
            </Text>

            {/* Start Date */}
            <TouchableOpacity
              onPress={() => openDatePicker('scheduleStart')}
              activeOpacity={0.7}
              style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`flex-row items-center px-4 ${radius.xl} mb-3`}
            >
              <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                <CalendarIcon size={s(iconSize.lg)} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {scheduleStartDate ? 'Start Date' : 'Pick Start Date'}
                </Text>
                {scheduleStartDate && (
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
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
                  <XIcon size={s(iconSize.sm)} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <ChevronRightIcon size={s(iconSize.md)} color={colors.text} />
              )}
            </TouchableOpacity>

            {/* Inline date picker for schedule start */}
            {showDatePicker && datePickerTarget === 'scheduleStart' && renderInlineDatePicker()}

            {/* End Date */}
            <TouchableOpacity
              onPress={() => openDatePicker('scheduleEnd')}
              activeOpacity={0.7}
              style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`flex-row items-center px-4 ${radius.xl}`}
            >
              <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                <FlagIcon size={s(iconSize.lg)} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {scheduleEndDate ? 'End Date' : 'Pick End Date'}
                </Text>
                {scheduleEndDate && (
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
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
                  <XIcon size={s(iconSize.sm)} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <ChevronRightIcon size={s(iconSize.md)} color={colors.text} />
              )}
            </TouchableOpacity>

            {/* Inline date picker for schedule end */}
            {showDatePicker && datePickerTarget === 'scheduleEnd' && renderInlineDatePicker()}

            {/* Schedule Validation Message */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
              <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular} mt-2`}>
                End date must be after start date
              </Text>
            )}

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, marginTop: s(20), marginHorizontal: s(-24) }} />
          </View>
        </ExpandableInfo>

        {/* Timer Picker (if time limit enabled and not scheduled) */}
        <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
          <View className="mt-6 px-6">
            <View>
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-white tracking-wider`}>
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
                parentScrollRef={mainScrollRef}
              />
            </View>

            {/* Or Pick a Date Divider */}
            <View className="flex-row items-center my-6 -mx-6">
              <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} px-4`}>or</Text>
              <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
            </View>

            {/* Pick a Date Button */}
            <TouchableOpacity
              onPress={() => {
                setTimerDays(0);
                setTimerHours(0);
                setTimerMinutes(0);
                setTimerSeconds(0);
                openDatePicker('targetDate');
              }}
              activeOpacity={0.7}
              style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`flex-row items-center px-4 ${radius.xl}`}
            >
              <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                <CalendarIcon size={s(iconSize.lg)} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {targetDate ? 'Change Date' : 'Pick a Date'}
                </Text>
                {targetDate && (
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
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
                  <XIcon size={s(iconSize.sm)} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <ChevronRightIcon size={s(iconSize.md)} color={colors.text} />
              )}
            </TouchableOpacity>

            {/* Inline date picker for target date */}
            {showDatePicker && datePickerTarget === 'targetDate' && renderInlineDatePicker()}

          </View>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, marginTop: s(16) }} />
        </ExpandableInfo>

        {/* ── Block Behavior ── */}

        {/* Block Settings Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <TouchableOpacity onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Block Settings App</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Essential settings remain accessible</Text>
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
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Prevents access to Android Settings during the block so that overlays and essential permissions cannot be disabled. Most essential settings like WiFi or battery settings remain accessible via quick panel by sliding down from your phone.
              </Text>
            </TouchableOpacity>
          </ExpandableInfo>
        </View>

        {/* Strict Mode Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <TouchableOpacity onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Strict Mode</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
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
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                UNTIMED PRESETS: Disables tap to continue button on block overlay. TIMED PRESETS: Removes the ability to unlock in any way and to dismiss blocked apps or sites. ONLY EXITS: timer expiring or Emergency Tapout (if enabled). Pair with the block settings toggle for maximum strictness.
              </Text>
            </TouchableOpacity>
          </ExpandableInfo>
        </View>

        {/* Emergency Tapout Toggle */}
        <ExpandableInfo expanded={strictMode && !noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Allow Emergency Tapout</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Use your emergency tapouts for this preset</Text>
              </TouchableOpacity>
              <AnimatedSwitch
                value={allowEmergencyTapout}
                onValueChange={handleEmergencyTapoutToggle}
              />
            </View>
            <ExpandableInfo expanded={!!expandedInfo.emergencyTapout}>
              <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
                </Text>
              </TouchableOpacity>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

      </ScrollView>

      {/* ============ Modals ============ */}

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
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.modal }} className={`w-full ${radius['2xl']} overflow-hidden`}>
            <View className="p-4">
              <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold} text-center mb-4`}>
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
                    backgroundColor: recurringUnit === unit ? colors.green : colors.cardLight,
                    borderWidth: 1, borderColor: colors.border,
                    ...shadow.card,
                  }}
                  className={`items-center justify-center py-4 px-4 ${radius.xl} mb-2`}
                >
                  <Text
                    style={{ color: colors.text }}
                    className={`${textSize.small} ${fontFamily.semibold} capitalize`}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
          if (dontShowAgain) {
            await AsyncStorage.setItem(STRICT_MODE_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => setStrictModeWarningVisible(false)}
      />

    </SafeAreaView>
  );
}

export default memo(PresetSettingsScreen);
