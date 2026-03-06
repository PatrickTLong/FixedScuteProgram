import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  Image,
} from 'react-native';
import AnimatedSwitch from '../components/AnimatedSwitch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '../config/api';
import { getAuthToken } from '../services/cardApi';
import ScheduleInfoModal from '../components/ScheduleInfoModal';
import InfoModal from '../components/InfoModal';
import DisableTapoutWarningModal from '../components/DisableTapoutWarningModal';
import BlockSettingsWarningModal from '../components/BlockSettingsWarningModal';
import RecurrenceInfoModal from '../components/RecurrenceInfoModal';
import StrictModeWarningModal from '../components/StrictModeWarningModal';
import { Preset } from '../components/PresetCard';
import HeaderIconButton from '../components/HeaderIconButton';
import BoxiconsFilled from '../components/BoxiconsFilled';
import { useAuth } from '../context/AuthContext';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import { usePresetSave } from '../navigation/PresetsStack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';

// ============ AsyncStorage Keys ============
const SCHEDULE_INFO_DISMISSED_KEY = 'schedule_info_dismissed';
const DISABLE_TAPOUT_WARNING_DISMISSED_KEY = 'disable_tapout_warning_dismissed';
const BLOCK_SETTINGS_WARNING_DISMISSED_KEY = 'block_settings_warning_dismissed';
const RECURRENCE_INFO_DISMISSED_KEY = 'recurrence_info_dismissed';
const STRICT_MODE_WARNING_DISMISSED_KEY = 'strict_mode_warning_dismissed';

// ============ Recurring schedule unit types ============
type RecurringUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

// ============ Icon Components ============
const ChevronLeftIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-big-left" size={size} color={color} />
);

const BackArrowIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-reply-big" size={size} color={color} />
);

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-x-circle" size={size} color={color} />
);

const FileIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-save" size={size} color={color} />
);

const CheckIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-check-circle" size={size} color={color} />
);

const PickDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-calendar-check" size={size} color={color} />
);

const StartDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-calendar-event" size={size} color={color} />
);

const EndDateIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-calendar-alt-2" size={size} color={color} />
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#9CA3AF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-right-circle" size={size} color={color} />
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

const SendIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-paper-plane" size={size} color={color} />
);

// ============ Time Preset Circles ============
const TIME_PRESETS = [
  { label: '00:00:01', seconds: 1 },
  { label: '00:00:15', seconds: 15 },
  { label: '00:00:30', seconds: 30 },
  { label: '00:01:00', seconds: 60 },
  { label: '00:05:00', seconds: 300 },
  { label: '00:10:00', seconds: 600 },
  { label: '00:15:00', seconds: 900 },
  { label: '00:30:00', seconds: 1800 },
  { label: '01:00:00', seconds: 3600 },
  { label: '02:00:00', seconds: 7200 },
  { label: '04:00:00', seconds: 14400 },
  { label: '08:00:00', seconds: 28800 },
  { label: '12:00:00', seconds: 43200 },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const totalToSeconds = (d: number, h: number, m: number, sec: number) => d * 86400 + h * 3600 + m * 60 + sec;
const secondsToTimer = (total: number) => {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return { d, h, m, sec };
};

const LONG_PRESS_INITIAL_DELAY = 400;
const LONG_PRESS_START_INTERVAL = 300;
const LONG_PRESS_MIN_INTERVAL = 50;
const LONG_PRESS_ACCELERATION = 0.85;

const TimePresetCircle = memo(({ label, onPress, onLongPressAdd }: {
  label: string;
  onPress: () => void;
  onLongPressAdd: () => void;
}) => {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const repeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLongPressAddRef = useRef(onLongPressAdd);
  onLongPressAddRef.current = onLongPressAdd;
  const didLongPress = useRef(false);
  const activeRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    activeRef.current = false;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (repeatRef.current) { clearTimeout(repeatRef.current); repeatRef.current = null; }
  }, []);

  const scheduleNext = useCallback((interval: number) => {
    if (!activeRef.current) return;
    repeatRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onLongPressAddRef.current();
      scheduleNext(Math.max(LONG_PRESS_MIN_INTERVAL, interval * LONG_PRESS_ACCELERATION));
    }, interval);
  }, []);

  const handlePressIn = useCallback(() => {
    didLongPress.current = false;
    activeRef.current = true;
    Animated.timing(scaleAnim, { toValue: 0.9, useNativeDriver: true, duration: 30 }).start();
    Animated.timing(borderAnim, { toValue: 1, useNativeDriver: false, duration: 30 }).start();
    timeoutRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onLongPressAddRef.current();
      scheduleNext(LONG_PRESS_START_INTERVAL);
    }, LONG_PRESS_INITIAL_DELAY);
  }, [scheduleNext, scaleAnim, borderAnim]);

  const handlePressOut = useCallback(() => {
    clearTimers();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
    Animated.timing(borderAnim, { toValue: 0, useNativeDriver: false, duration: 200 }).start();
  }, [clearTimers, scaleAnim, borderAnim]);

  const handlePress = useCallback(() => {
    if (!didLongPress.current) {
      if (haptics.bubbleButton.enabled) {
        triggerHaptic(haptics.bubbleButton.type);
      }
      onPress();
    }
  }, [onPress]);

  useEffect(() => clearTimers, [clearTimers]);

  const circleSize = s(90);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, '#FFFFFF'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Animated.View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: animatedBorderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{ color: colors.text, fontSize: s(12) }}
            className={fontFamily.semibold}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

// ============ Recurrence Wheel Picker Component ============
const RECURRENCE_ITEM_HEIGHT = 40;
const RECURRENCE_VISIBLE_ITEMS = 3;
const RECURRENCE_WINDOW_BUFFER = 5;
const RECURRENCE_VALUES = Array.from({ length: 99 }, (_, i) => i + 1);
const RECURRENCE_UNITS: RecurringUnit[] = ['minutes', 'hours', 'days', 'weeks', 'months'];

interface RecurrenceWheelProps {
  values: (number | string)[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  textColor: string;
  textMutedColor: string;
  itemHeight: number;
  wheelWidth: number;
  selectedFontSize: number;
  unselectedFontSize: number;
  formatValue?: (value: number | string) => string;
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const RecurrenceWheel = memo(({ values, selectedValue, onValueChange, textColor, textMutedColor, itemHeight, wheelWidth, selectedFontSize, unselectedFontSize, formatValue, parentScrollRef }: RecurrenceWheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const scrolledByUser = useRef(false);
  const lastTickIndex = useRef(values.indexOf(selectedValue));

  const selectedIndex = values.indexOf(selectedValue);
  const [windowStart, setWindowStart] = useState(() => Math.max(0, selectedIndex - RECURRENCE_WINDOW_BUFFER));
  const [windowEnd, setWindowEnd] = useState(() => Math.min(values.length - 1, selectedIndex + RECURRENCE_WINDOW_BUFFER));

  const windowedValues = useMemo(() => values.slice(windowStart, windowEnd + 1), [values, windowStart, windowEnd]);
  const topSpacerHeight = windowStart * itemHeight;
  const bottomSpacerHeight = (values.length - 1 - windowEnd) * itemHeight;

  useEffect(() => {
    if (scrolledByUser.current) {
      scrolledByUser.current = false;
      return;
    }
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: index * itemHeight, animated: false });
    }
  }, [selectedValue, values, itemHeight]);

  const updateWindow = useCallback((centerIndex: number) => {
    const newStart = Math.max(0, centerIndex - RECURRENCE_WINDOW_BUFFER);
    const newEnd = Math.min(values.length - 1, centerIndex + RECURRENCE_WINDOW_BUFFER);
    setWindowStart(prev => prev !== newStart ? newStart : prev);
    setWindowEnd(prev => prev !== newEnd ? newEnd : prev);
  }, [values.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    if (clampedIndex !== lastTickIndex.current) {
      if (haptics.timeWheel.enabled) {
        const steps = Math.abs(clampedIndex - lastTickIndex.current);
        for (let i = 0; i < steps; i++) {
          triggerHaptic(haptics.timeWheel.type);
        }
      }
      lastTickIndex.current = clampedIndex;
    }

    updateWindow(clampedIndex);
  }, [values.length, itemHeight, updateWindow]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    if (values[clampedIndex] !== selectedValue) {
      scrolledByUser.current = true;
      onValueChange(values[clampedIndex]);
    }
  }, [values, selectedValue, onValueChange, itemHeight]);

  const paddingVertical = (itemHeight * (RECURRENCE_VISIBLE_ITEMS - 1)) / 2;

  return (
    <View
      style={{ alignItems: 'center' }}
      onTouchStart={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: false }) : undefined}
      onTouchEnd={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
      onTouchCancel={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
    >
      <View style={{ height: itemHeight * RECURRENCE_VISIBLE_ITEMS, width: wheelWidth, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            if (e.nativeEvent.velocity?.y === 0) handleScrollEnd(e);
          }}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={false}
          overScrollMode="never"
        >
          {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
          {windowedValues.map((value) => {
            const isSelected = value === selectedValue;
            const displayValue = formatValue ? formatValue(value) : String(value);
            return (
              <View key={String(value)} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: isSelected ? selectedFontSize : unselectedFontSize,
                    color: isSelected ? textColor : textMutedColor,
                  }}
                  className={isSelected ? fontFamily.bold : fontFamily.regular}
                >
                  {displayValue}
                </Text>
              </View>
            );
          })}
          {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
        </ScrollView>
      </View>
    </View>
  );
});

interface RecurrenceWheelPickerProps {
  value: number;
  unit: RecurringUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: RecurringUnit) => void;
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const RecurrenceWheelPicker = memo(({ value, unit, onValueChange, onUnitChange, parentScrollRef }: RecurrenceWheelPickerProps) => {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const itemHeight = s(RECURRENCE_ITEM_HEIGHT);
  const numberWheelWidth = s(50);
  const unitWheelWidth = s(115);
  const textMutedColor = colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)';
  const selectedFontSize = s(24);
  const unselectedFontSize = s(18);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: s(16) }}>
      <RecurrenceWheel
        values={RECURRENCE_VALUES}
        selectedValue={value}
        onValueChange={(val) => onValueChange(val as number)}
        textColor={colors.text}
        textMutedColor={textMutedColor}
        itemHeight={itemHeight}
        wheelWidth={numberWheelWidth}
        selectedFontSize={selectedFontSize}
        unselectedFontSize={unselectedFontSize}
        formatValue={(v) => String(v).padStart(2, '0')}
        parentScrollRef={parentScrollRef}
      />
      <RecurrenceWheel
        values={RECURRENCE_UNITS}
        selectedValue={unit}
        onValueChange={(val) => onUnitChange(val as RecurringUnit)}
        textColor={colors.text}
        textMutedColor={textMutedColor}
        itemHeight={itemHeight}
        wheelWidth={unitWheelWidth}
        selectedFontSize={selectedFontSize}
        unselectedFontSize={unselectedFontSize}
        parentScrollRef={parentScrollRef}
      />
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

// ============ AnimatedInfoExpand Component ============
const AnimatedInfoExpand = ({ expanded, children }: { expanded: boolean; children: React.ReactNode }) => {
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const measured = useRef(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [expanded, anim]);

  return (
    <Animated.View
      style={{
        height: contentHeight > 0
          ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] })
          : expanded ? undefined : 0,
        opacity: anim,
        overflow: 'hidden',
      }}
    >
      <View
        onLayout={(e) => {
          if (!measured.current) {
            measured.current = true;
            setContentHeight(e.nativeEvent.layout.height);
          }
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
};

// ============ InfoIcon Component ============
const InfoIcon = ({ expanded, color, size }: { expanded: boolean; color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    {expanded ? (
      <Path d="M12 22c5.51 0 10-4.49 10-10S17.51 2 12 2 2 6.49 2 12s4.49 10 10 10M11 7h2v2h-2zm0 4h2v6h-2z" />
    ) : (
      <>
        <Path d="M11 11h2v6h-2zm0-4h2v2h-2z" />
        <Path d="M12 22c5.51 0 10-4.49 10-10S17.51 2 12 2 2 6.49 2 12s4.49 10 10 10m0-18c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8" />
      </>
    )}
  </Svg>
);

// ============ Navigation Types ============
type PresetSettingsNavigationProp = BottomTabNavigationProp<MainTabParamList, 'PresetSettings'>;

// ============ Main Screen Component ============
function PresetSettingsScreen() {
  const navigation = useNavigation<PresetSettingsNavigationProp>();
  const { onSave, getEditingPreset, getExistingPresets, getEmail, getPresetSettingsParams, setPresetSettingsParams, getFinalSettingsState, setFinalSettingsState, setDatePickerParams, setDatePickerResult, getDatePickerResult } = usePresetSave();
  const paramsSnapshot = getPresetSettingsParams();
  const name = paramsSnapshot?.name ?? '';
  const selectedApps = paramsSnapshot?.selectedApps ?? [];
  const blockedWebsites = paramsSnapshot?.blockedWebsites ?? [];
  const installedApps = paramsSnapshot?.installedApps ?? [];
  const iosSelectedAppsCount = paramsSnapshot?.iosSelectedAppsCount ?? 0;
  const { tapoutStatus, userEmail } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();

  // ============ Toggle/Timer/Schedule State ============
  const [blockSettings, setBlockSettings] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [timerDays, setTimerDays] = useState(0);
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const hasSaved = useRef(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [dateEnabled, setDateEnabled] = useState(false);

  // Emergency tapout feature
  const tapoutHeartBeat = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(tapoutHeartBeat, { toValue: 1.15, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(tapoutHeartBeat, { toValue: 1, duration: 80, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(60),
        Animated.timing(tapoutHeartBeat, { toValue: 1.1, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(tapoutHeartBeat, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [tapoutHeartBeat]);

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

  // Custom overlay
  const [customOverlayEnabled, setCustomOverlayEnabled] = useState(false);
  const [customBlockedText, setCustomBlockedText] = useState('');
  const [customOverlayImage, setCustomOverlayImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Expandable info dropdowns
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const toggleInfo = useCallback((key: string) => {
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
  const [recurrenceInfoVisible, setRecurrenceInfoVisible] = useState(false);
  const [svgKey, setSvgKey] = useState(0);
  const [skipSwitchAnimation, setSkipSwitchAnimation] = useState(false);

  // Refs
  const mainScrollRef = useRef<ScrollView>(null);

  // Refs to track current form state for saving on blur
  const blockSettingsRef = useRef(blockSettings);
  const noTimeLimitRef = useRef(noTimeLimit);
  const timerDaysRef = useRef(timerDays);
  const timerHoursRef = useRef(timerHours);
  const timerMinutesRef = useRef(timerMinutes);
  const timerSecondsRef = useRef(timerSeconds);
  const timerEnabledRef = useRef(timerEnabled);
  const targetDateRef = useRef(targetDate);
  const dateEnabledRef = useRef(dateEnabled);
  const allowEmergencyTapoutRef = useRef(allowEmergencyTapout);
  const strictModeRef = useRef(strictMode);
  const isScheduledRef = useRef(isScheduled);
  const scheduleStartDateRef = useRef(scheduleStartDate);
  const scheduleEndDateRef = useRef(scheduleEndDate);
  const isRecurringRef = useRef(isRecurring);
  const recurringValueRef = useRef(recurringValue);
  const recurringUnitRef = useRef(recurringUnit);
  const customOverlayEnabledRef = useRef(customOverlayEnabled);
  const customBlockedTextRef = useRef(customBlockedText);
  const customOverlayImageRef = useRef(customOverlayImage);

  // Keep refs in sync with state
  blockSettingsRef.current = blockSettings;
  noTimeLimitRef.current = noTimeLimit;
  timerDaysRef.current = timerDays;
  timerHoursRef.current = timerHours;
  timerMinutesRef.current = timerMinutes;
  timerSecondsRef.current = timerSeconds;
  timerEnabledRef.current = timerEnabled;
  targetDateRef.current = targetDate;
  dateEnabledRef.current = dateEnabled;
  allowEmergencyTapoutRef.current = allowEmergencyTapout;
  strictModeRef.current = strictMode;
  isScheduledRef.current = isScheduled;
  scheduleStartDateRef.current = scheduleStartDate;
  scheduleEndDateRef.current = scheduleEndDate;
  isRecurringRef.current = isRecurring;
  recurringValueRef.current = recurringValue;
  recurringUnitRef.current = recurringUnit;
  customOverlayEnabledRef.current = customOverlayEnabled;
  customBlockedTextRef.current = customBlockedText;
  customOverlayImageRef.current = customOverlayImage;

  // ============ Reinitialize from editingPreset each time screen gains focus ============
  // Restores from saved finalSettingsState if returning from EditPresetApps (back-and-forward),
  // otherwise initializes from editingPreset or defaults.
  useFocusEffect(
    useCallback(() => {
      setSvgKey(k => k + 1);
      const savedState = getFinalSettingsState();
      if (savedState) {
        // Returning from EditPresetApps — restore the form state the user already configured
        setBlockSettings(savedState.blockSettings);
        setNoTimeLimit(savedState.noTimeLimit);
        setTimerDays(savedState.timerDays);
        setTimerHours(savedState.timerHours);
        setTimerMinutes(savedState.timerMinutes);
        setTimerSeconds(savedState.timerSeconds);
        setTimerEnabled(savedState.timerEnabled ?? (savedState.timerDays > 0 || savedState.timerHours > 0 || savedState.timerMinutes > 0 || savedState.timerSeconds > 0));
        setTargetDate(savedState.targetDate ? new Date(savedState.targetDate) : null);
        setDateEnabled(savedState.dateEnabled ?? !!savedState.targetDate);
        setAllowEmergencyTapout(savedState.allowEmergencyTapout);
        setStrictMode(savedState.strictMode);
        setIsScheduled(savedState.isScheduled);
        setScheduleStartDate(savedState.scheduleStartDate ? new Date(savedState.scheduleStartDate) : null);
        setScheduleEndDate(savedState.scheduleEndDate ? new Date(savedState.scheduleEndDate) : null);
        setIsRecurring(savedState.isRecurring);
        setRecurringValue(savedState.recurringValue);
        setRecurringUnit(savedState.recurringUnit);
        setCustomBlockedText(savedState.customBlockedText ?? '');
        setCustomOverlayImage(savedState.customOverlayImage ?? '');
        setCustomOverlayEnabled(!!(savedState.customBlockedText || savedState.customOverlayImage));
        console.log('[OVERLAY] Restored from savedState — text:', savedState.customBlockedText, 'image:', savedState.customOverlayImage);
      } else {
        const editingPreset = getEditingPreset();
        if (editingPreset) {
          setBlockSettings(editingPreset.blockSettings);
          setNoTimeLimit(editingPreset.noTimeLimit);
          setTimerDays(editingPreset.timerDays);
          setTimerHours(editingPreset.timerHours);
          setTimerMinutes(editingPreset.timerMinutes);
          setTimerSeconds(editingPreset.timerSeconds ?? 0);
          setTimerEnabled(editingPreset.timerDays > 0 || editingPreset.timerHours > 0 || editingPreset.timerMinutes > 0 || (editingPreset.timerSeconds ?? 0) > 0);
          setTargetDate(editingPreset.targetDate ? new Date(editingPreset.targetDate) : null);
          setDateEnabled(!!editingPreset.targetDate);
          setAllowEmergencyTapout(editingPreset.allowEmergencyTapout ?? false);
          setStrictMode(editingPreset.strictMode ?? false);
          setIsScheduled(editingPreset.isScheduled ?? false);
          setScheduleStartDate(editingPreset.scheduleStartDate ? new Date(editingPreset.scheduleStartDate) : null);
          setScheduleEndDate(editingPreset.scheduleEndDate ? new Date(editingPreset.scheduleEndDate) : null);
          setIsRecurring(editingPreset.repeat_enabled ?? false);
          setRecurringValue(editingPreset.repeat_interval?.toString() ?? '1');
          setRecurringUnit(editingPreset.repeat_unit ?? 'hours');
          setCustomBlockedText(editingPreset.customBlockedText ?? '');
          setCustomOverlayImage(editingPreset.customOverlayImage ?? '');
          setCustomOverlayEnabled(!!(editingPreset.customBlockedText || editingPreset.customOverlayImage));
          console.log('[OVERLAY] Restored from editingPreset — text:', editingPreset.customBlockedText, 'image:', editingPreset.customOverlayImage);
        } else {
          // New preset defaults
          setBlockSettings(false);
          setNoTimeLimit(false);
          setTimerDays(0);
          setTimerHours(0);
          setTimerMinutes(0);
          setTimerSeconds(0);
          setTimerEnabled(false);
          setTargetDate(null);
          setDateEnabled(false);
          setAllowEmergencyTapout(true); // Enabled by default for safety
          setStrictMode(false);
          setIsScheduled(false);
          setScheduleStartDate(null);
          setScheduleEndDate(null);
          setIsRecurring(false);
          setRecurringValue('1');
          setRecurringUnit('hours');
          setCustomBlockedText('');
          setCustomOverlayImage('');
          setCustomOverlayEnabled(false);
          console.log('[OVERLAY] New preset — defaults cleared');
        }
      }
      // Apply date picker result if returning from DatePicker screen
      const dpResult = getDatePickerResult();
      if (dpResult) {
        const finalDate = new Date(dpResult.selectedDate);
        if (dpResult.target === 'targetDate') {
          setTargetDate(finalDate);
          setTimerDays(0);
          setTimerHours(0);
          setTimerMinutes(0);
          setTimerSeconds(0);
        } else if (dpResult.target === 'scheduleStart') {
          setScheduleStartDate(finalDate);
          const currentEnd = savedState?.scheduleEndDate ? new Date(savedState.scheduleEndDate) : null;
          if (currentEnd && currentEnd <= finalDate) {
            setScheduleEndDate(null);
          }
        } else if (dpResult.target === 'scheduleEnd') {
          setScheduleEndDate(finalDate);
        }
        setDatePickerResult(null);
      }

      // Reset UI state
      hasSaved.current = false;
      setExpandedInfo({});
      setSkipSwitchAnimation(true);
      requestAnimationFrame(() => {
        setSkipSwitchAnimation(false);
      });

      // Save form state to context when screen loses focus (user taps back)
      // Skip if preset was already saved — refs were cleared by handleSave
      return () => {
        if (hasSaved.current) return;
        setFinalSettingsState({
          blockSettings: blockSettingsRef.current,
          noTimeLimit: noTimeLimitRef.current,
          timerDays: timerDaysRef.current,
          timerHours: timerHoursRef.current,
          timerMinutes: timerMinutesRef.current,
          timerSeconds: timerSecondsRef.current,
          timerEnabled: timerEnabledRef.current,
          targetDate: targetDateRef.current ? targetDateRef.current.toISOString() : null,
          dateEnabled: dateEnabledRef.current,
          allowEmergencyTapout: allowEmergencyTapoutRef.current,
          strictMode: strictModeRef.current,
          isScheduled: isScheduledRef.current,
          scheduleStartDate: scheduleStartDateRef.current ? scheduleStartDateRef.current.toISOString() : null,
          scheduleEndDate: scheduleEndDateRef.current ? scheduleEndDateRef.current.toISOString() : null,
          isRecurring: isRecurringRef.current,
          recurringValue: recurringValueRef.current,
          recurringUnit: recurringUnitRef.current,
          customBlockedText: customBlockedTextRef.current,
          customOverlayImage: customOverlayImageRef.current,
        });
      };
    }, [getEditingPreset, getFinalSettingsState, setFinalSettingsState, getDatePickerResult, setDatePickerResult])
  );

  // ============ Emergency Tapout Handler ============
  const handleEmergencyTapoutToggle = useCallback((value: boolean) => {
    if (value) {
      if ((tapoutStatus?.remaining ?? 0) <= 0) {
        setNoTapoutsModalVisible(true);
      } else {
        setAllowEmergencyTapout(true);
      }
    } else {
      AsyncStorage.getItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY).then(dismissed => {
        if (dismissed !== 'true') {
          setDisableTapoutWarningVisible(true);
        } else {
          setAllowEmergencyTapout(false);
        }
      });
    }
  }, [tapoutStatus]);

  // ============ Open Date Picker (navigates to DatePicker screen) ============
  const openDatePicker = useCallback((target: 'targetDate' | 'scheduleStart' | 'scheduleEnd') => {
    let existingDate: Date | null = null;
    if (target === 'targetDate') existingDate = targetDate;
    else if (target === 'scheduleStart') existingDate = scheduleStartDate;
    else if (target === 'scheduleEnd') existingDate = scheduleEndDate;

    setDatePickerParams({
      target,
      existingDate: existingDate ? existingDate.toISOString() : null,
      minimumDate: target === 'scheduleEnd' && scheduleStartDate
        ? scheduleStartDate.toISOString() : null,
    });
    setDatePickerResult(null);
    navigation.navigate('DatePicker');
  }, [targetDate, scheduleStartDate, scheduleEndDate, navigation, setDatePickerParams, setDatePickerResult]);

  // ============ Image Upload Handler ============
  const handleImageUpload = useCallback(async () => {
    console.log('[OVERLAY] Image picker launched');
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 512,
        maxHeight: 512,
      });
      if (result.didCancel || !result.assets?.[0]) {
        console.log('[OVERLAY] Image picker cancelled');
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      console.log('[OVERLAY] Image selected:', asset.uri, 'type:', asset.type, 'name:', asset.fileName);
      setImageUploading(true);
      const editingPreset = getEditingPreset();
      const presetId = editingPreset?.id || 'temp_' + Date.now();
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'overlay.jpg',
      } as any);
      formData.append('presetId', presetId);

      const token = await getAuthToken();
      console.log('[OVERLAY] Uploading to', `${API_URL}/api/overlay-image`, 'hasToken:', !!token);
      const response = await fetch(`${API_URL}/api/overlay-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      console.log('[OVERLAY] Upload response:', JSON.stringify(data));
      if (data.url) {
        const imageUrl = data.url + '?t=' + Date.now();
        console.log('[OVERLAY] Image URL set:', imageUrl);
        setCustomOverlayImage(imageUrl);
      }
    } catch (e) {
      console.warn('[OVERLAY] Image upload failed', e);
    } finally {
      setImageUploading(false);
    }
  }, [getEditingPreset]);

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
  const handleSave = useCallback(() => {
    if (!name.trim() || hasSaved.current || !canSave) return;

    const editingPreset = getEditingPreset();
    const existingPresets = getExistingPresets();

    const trimmedName = name.trim().toLowerCase();
    const duplicateExists = existingPresets.some(
      (p: Preset) => p.name.toLowerCase() === trimmedName && p.id !== editingPreset?.id
    );

    if (duplicateExists) {
      setDuplicateNameModalVisible(true);
      return;
    }

    hasSaved.current = true;

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
      timerDays: noTimeLimit || isScheduled ? 0 : timerDays,
      timerHours: noTimeLimit || isScheduled ? 0 : timerHours,
      timerMinutes: noTimeLimit || isScheduled ? 0 : timerMinutes,
      timerSeconds: noTimeLimit || isScheduled ? 0 : timerSeconds,
      targetDate: noTimeLimit || isScheduled ? null : (targetDate ? targetDate.toISOString() : null),
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
      customBlockedText: customOverlayEnabled && customBlockedText ? customBlockedText.trim() : undefined,
      customOverlayImage: customOverlayEnabled && customOverlayImage ? customOverlayImage : undefined,
    };

    console.log('[OVERLAY] Saving preset — overlayEnabled:', customOverlayEnabled, 'text:', newPreset.customBlockedText, 'image:', newPreset.customOverlayImage);

    // Navigate immediately — save happens in the background
    setFinalSettingsState(null);
    setPresetSettingsParams(null);
    navigation.navigate({ name: 'Presets' } as any);
    onSave(newPreset);
  }, [name, canSave, getEditingPreset, getExistingPresets, installedSelectedApps, blockedWebsites, blockSettings, noTimeLimit, timerDays, timerHours, timerMinutes, timerSeconds, targetDate, onSave, allowEmergencyTapout, strictMode, isScheduled, scheduleStartDate, scheduleEndDate, isRecurring, recurringValue, recurringUnit, navigation, setFinalSettingsState, customBlockedText, customOverlayImage, customOverlayEnabled]);


  // ============ Render ============
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header — key forces SVG remount on focus to fix react-freeze stroke color bug */}
      <View key={svgKey} style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={() => navigation.navigate('EditPresetApps')} style={{ width: s(40) }}>
          <BackArrowIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Final Settings</Text>
        <HeaderIconButton onPress={handleSave} disabled={!canSave} style={{ width: s(40) }}>
          <FileIcon size={s(iconSize.headerNav)} color={canSave ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <ScrollView ref={mainScrollRef} className="flex-1 pt-6" contentContainerStyle={{ paddingBottom: s(100) }}>

        {/* ── Time & Duration ── */}

        {/* No Time Limit Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <BoxiconsFilled name="bx-infinite" size={s(iconSize.toggleRow)} color={colors.text} style={{ marginRight: s(14) }} />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>No Time Limit</Text>
                  <TouchableOpacity onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.noTimeLimit} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Block until manually unlocked</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={noTimeLimit}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                setNoTimeLimit(value);
                requestAnimationFrame(() => {
                  if (value) {
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                    setTimerEnabled(false);
                    setTargetDate(null);
                    setDateEnabled(false);
                    setIsScheduled(false);
                    setScheduleStartDate(null);
                    setScheduleEndDate(null);
                    setStrictMode(false);
                    setAllowEmergencyTapout(false);
                  }
                });
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.noTimeLimit}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Block stays active until manually ended via home screen for No Time Limit Presets.
              </Text>
            </View>
          </AnimatedInfoExpand>
        </View>

        {/* Schedule for Later Toggle */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <Svg width={s(iconSize.toggleRow)} height={s(iconSize.toggleRow)} viewBox="0 0 24 24" fill={colors.text} style={{ marginRight: s(14) }}>
                  <Path d="M12 11.993a.75.75 0 0 0-.75.75v.006c0 .414.336.75.75.75h.006a.75.75 0 0 0 .75-.75v-.006a.75.75 0 0 0-.75-.75H12ZM12 16.494a.75.75 0 0 0-.75.75v.005c0 .414.335.75.75.75h.005a.75.75 0 0 0 .75-.75v-.005a.75.75 0 0 0-.75-.75H12ZM8.999 17.244a.75.75 0 0 1 .75-.75h.006a.75.75 0 0 1 .75.75v.006a.75.75 0 0 1-.75.75h-.006a.75.75 0 0 1-.75-.75v-.006ZM7.499 16.494a.75.75 0 0 0-.75.75v.005c0 .414.336.75.75.75h.005a.75.75 0 0 0 .75-.75v-.005a.75.75 0 0 0-.75-.75H7.5ZM13.499 14.997a.75.75 0 0 1 .75-.75h.006a.75.75 0 0 1 .75.75v.005a.75.75 0 0 1-.75.75h-.006a.75.75 0 0 1-.75-.75v-.005ZM14.25 16.494a.75.75 0 0 0-.75.75v.006c0 .414.335.75.75.75h.005a.75.75 0 0 0 .75-.75v-.006a.75.75 0 0 0-.75-.75h-.005ZM15.75 14.995a.75.75 0 0 1 .75-.75h.005a.75.75 0 0 1 .75.75v.006a.75.75 0 0 1-.75.75H16.5a.75.75 0 0 1-.75-.75v-.006ZM13.498 12.743a.75.75 0 0 1 .75-.75h2.25a.75.75 0 1 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75ZM6.748 14.993a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
                  <Path fillRule="evenodd" clipRule="evenodd" d="M18 2.993a.75.75 0 0 0-1.5 0v1.5h-9V2.994a.75.75 0 1 0-1.5 0v1.497h-.752a3 3 0 0 0-3 3v11.252a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V7.492a3 3 0 0 0-3-3H18V2.993ZM3.748 18.743v-7.5a1.5 1.5 0 0 1 1.5-1.5h13.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-13.5a1.5 1.5 0 0 1-1.5-1.5Z" />
                </Svg>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Schedule for Later</Text>
                    <TouchableOpacity onPress={() => toggleInfo('schedule')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.schedule} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Set a future start and end time, with optional recurrence</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={isScheduled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setIsScheduled(value);
                  requestAnimationFrame(() => {
                    if (value) {
                      setNoTimeLimit(false);
                      setTimerDays(0);
                      setTimerHours(0);
                      setTimerMinutes(0);
                      setTimerSeconds(0);
                      setTimerEnabled(false);
                      setTargetDate(null);
                      setDateEnabled(false);
                      AsyncStorage.getItem(SCHEDULE_INFO_DISMISSED_KEY).then(dismissed => {
                        if (dismissed !== 'true') {
                          setScheduleInfoVisible(true);
                        }
                      });
                    } else {
                      setScheduleStartDate(null);
                      setScheduleEndDate(null);
                    }
                  });
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.schedule}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Set a future start and end time. Hides timer options since duration is determined by your schedule. You can also set up recurring blocks when picking your end date.
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Schedule Date Pickers */}
            <ExpandableInfo expanded={isScheduled}>
              <View className="px-6" style={{ paddingTop: s(8) }}>

            {/* Start Date */}
            <TouchableOpacity
              onPress={() => openDatePicker('scheduleStart')}
              activeOpacity={0.7}
              style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
              className={`flex-row items-center px-4 ${radius.xl} mb-3`}
            >
                <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                  <StartDateIcon size={s(iconSize.lg)} />
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
                    onPress={() => setScheduleStartDate(null)}
                    hitSlop={{ top: s(10), bottom: s(10), left: s(10), right: s(10) }}
                  >
                    <XIcon size={s(iconSize.sm)} color={colors.text} />
                  </TouchableOpacity>
                ) : (
                  <ChevronRightIcon size={s(iconSize.chevron)} color={colors.text} />
                )}
            </TouchableOpacity>

            {/* Date picker rendered as full-screen overlay */}

            {/* End Date */}
            <TouchableOpacity
              onPress={() => openDatePicker('scheduleEnd')}
                activeOpacity={0.7}
                style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                className={`flex-row items-center px-4 ${radius.xl} mb-4`}
              >
                <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                  <EndDateIcon size={s(iconSize.lg)} />
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
                    onPress={() => setScheduleEndDate(null)}
                    hitSlop={{ top: s(10), bottom: s(10), left: s(10), right: s(10) }}
                  >
                    <XIcon size={s(iconSize.sm)} color={colors.text} />
                  </TouchableOpacity>
                ) : (
                  <ChevronRightIcon size={s(iconSize.chevron)} color={colors.text} />
                )}
            </TouchableOpacity>

            {/* Date picker rendered as full-screen overlay */}

            {/* Schedule Validation Message */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate <= scheduleStartDate && (
              <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular} mt-2`}>
                End date must be after start date
              </Text>
            )}

            {/* Recurring Schedule - only when both dates are valid */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate && (
              <View style={{ marginHorizontal: s(-24) }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} />
                <View>
                  <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
                    <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                      <BoxiconsFilled name="bx-refresh-cw" size={s(iconSize.toggleRow)} color={colors.text} style={{ marginRight: s(14) }} />
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Recurring Schedule</Text>
                          <TouchableOpacity onPress={() => toggleInfo('recurring')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                            <InfoIcon expanded={!!expandedInfo.recurring} color={colors.textSecondary} size={s(16)} />
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Repeat this block automatically</Text>
                      </View>
                    </View>
                    <AnimatedSwitch
                      size="small"
                      value={isRecurring}
                      animate={!skipSwitchAnimation}
                      onValueChange={(value: boolean) => {
                        setIsRecurring(value);
                        if (value) {
                          AsyncStorage.getItem(RECURRENCE_INFO_DISMISSED_KEY).then(dismissed => {
                            if (dismissed !== 'true') {
                              setRecurrenceInfoVisible(true);
                            }
                          });
                        }
                      }}
                    />
                  </View>
                  <AnimatedInfoExpand expanded={!!expandedInfo.recurring}>
                    <View className="px-6 pb-4">
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                        Automatically repeats this blocking session at the interval you choose. After each session ends, the next one will start based on your selected frequency.
                      </Text>
                    </View>
                  </AnimatedInfoExpand>
                  {/* Recurring Options */}
                  <ExpandableInfo expanded={isRecurring}>
                    <View
                      className="px-6 pb-4"
                      style={{ paddingTop: s(8) }}
                    >

                    {/* Wheel Picker for Recurrence */}
                    <View
                      style={{ backgroundColor: colors.card, paddingVertical: s(16), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                      className={`${radius.xl} mb-3`}
                    >
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} text-center mb-3`}>
                        Repeat Every
                      </Text>
                      <RecurrenceWheelPicker
                        value={parseInt(recurringValue, 10) || 1}
                        unit={recurringUnit}
                        onValueChange={(val) => setRecurringValue(val.toString())}
                        onUnitChange={setRecurringUnit}
                        parentScrollRef={mainScrollRef}
                      />
                    </View>

                    {/* Next Occurrence Preview */}
                    {(() => {
                      if (!scheduleStartDate || !scheduleEndDate || !isRecurring) return null;

                      const parsedValue = parseInt(recurringValue, 10);
                      const value = isNaN(parsedValue) || parsedValue <= 0 ? 1 : parsedValue;
                      const duration = scheduleEndDate.getTime() - scheduleStartDate.getTime();

                      let nextStart: Date;
                      let nextEnd: Date;

                      if (recurringUnit === 'minutes' || recurringUnit === 'hours') {
                        const intervalMs = recurringUnit === 'minutes'
                          ? value * 60 * 1000
                          : value * 60 * 60 * 1000;
                        const newStartTime = scheduleEndDate.getTime() + intervalMs;
                        nextStart = new Date(newStartTime);
                        nextEnd = new Date(newStartTime + duration);
                      } else {
                        nextStart = new Date(scheduleStartDate);
                        nextEnd = new Date(scheduleEndDate);
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
                      );
                    })()}
                    </View>
                  </ExpandableInfo>
                </View>
              </View>
            )}
              </View>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* Set Timer Toggle (if time limit enabled and not scheduled) */}
        <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <BoxiconsFilled name="bx-alarm-check" size={s(iconSize.toggleRow)} color={colors.text} style={{ marginRight: s(14) }} />
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Set Fixed Time</Text>
                    <TouchableOpacity onPress={() => toggleInfo('setTimer')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.setTimer} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    Set a countdown duration
                  </Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={timerEnabled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setTimerEnabled(value);
                  requestAnimationFrame(() => {
                    if (value) {
                      setDateEnabled(false);
                      setTargetDate(null);
                    } else {
                      setTimerDays(0);
                      setTimerHours(0);
                      setTimerMinutes(0);
                      setTimerSeconds(0);
                    }
                  });
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.setTimer}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Set a fixed countdown timer for how long the block should last. Each bubble is formatted as HH:MM:SS (hours, minutes, seconds).
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Time preset circles (shown when timer is enabled) */}
            <ExpandableInfo expanded={timerEnabled}>
              <View className="pb-4" style={{ paddingTop: s(8) }}>
                {/* Current total display — fixed DD:HH:MM:SS format */}
                <View style={{ position: 'relative' }} className="items-center justify-center mb-4 px-6">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>
                      {`${pad2(timerDays)}:${pad2(timerHours)}:${pad2(timerMinutes)}:${pad2(timerSeconds)}`}
                    </Text>
                  </View>
                  <View style={{ position: 'absolute', right: s(70), opacity: (timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0) ? 1 : 0 }} pointerEvents={(timerDays > 0 || timerHours > 0 || timerMinutes > 0 || timerSeconds > 0) ? 'auto' : 'none'}>
                    <HeaderIconButton onPress={() => { setTimerDays(0); setTimerHours(0); setTimerMinutes(0); setTimerSeconds(0); }} flashSize={28}>
                      <XIcon size={s(iconSize.sm)} color={colors.text} />
                    </HeaderIconButton>
                  </View>
                </View>
                {/* Scrollable time presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: s(24), gap: s(10), paddingVertical: s(8) }}
                >
                  {TIME_PRESETS.map((preset) => (
                      <TimePresetCircle
                        key={preset.label}
                        label={preset.label}
                        onPress={() => {
                          const currentTotal = totalToSeconds(timerDaysRef.current, timerHoursRef.current, timerMinutesRef.current, timerSecondsRef.current);
                          const newTotal = currentTotal + preset.seconds;
                          const t = secondsToTimer(newTotal);
                          setTimerDays(t.d);
                          setTimerHours(t.h);
                          setTimerMinutes(t.m);
                          setTimerSeconds(t.sec);
                        }}
                        onLongPressAdd={() => {
                          const currentTotal = totalToSeconds(timerDaysRef.current, timerHoursRef.current, timerMinutesRef.current, timerSecondsRef.current);
                          const newTotal = currentTotal + preset.seconds;
                          const t = secondsToTimer(newTotal);
                          setTimerDays(t.d);
                          setTimerHours(t.h);
                          setTimerMinutes(t.m);
                          setTimerSeconds(t.sec);
                        }}
                      />
                  ))}
                </ScrollView>
              </View>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* Pick a Date Toggle (if time limit enabled and not scheduled) */}
        <ExpandableInfo expanded={!noTimeLimit && !isScheduled} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <PickDateIcon size={s(iconSize.toggleRow)} color={colors.text} />
                <View style={{ marginLeft: s(14) }} className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Pick a Date</Text>
                    <TouchableOpacity onPress={() => toggleInfo('pickDate')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.pickDate} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    {targetDate
                      ? `Until ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                      : 'Block until a specific date and time'}
                  </Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={dateEnabled}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  setDateEnabled(value);
                  requestAnimationFrame(() => {
                    if (value) {
                      setTimerEnabled(false);
                      setTimerDays(0);
                      setTimerHours(0);
                      setTimerMinutes(0);
                      setTimerSeconds(0);
                    } else {
                      setTargetDate(null);
                    }
                  });
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.pickDate}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Choose a specific date and time for the block to end.
                </Text>
              </View>
            </AnimatedInfoExpand>
            {/* Date picker button (shown when date is enabled) */}
            <ExpandableInfo expanded={dateEnabled}>
              <View className="px-6 pb-4">
                <TouchableOpacity
                  onPress={() => openDatePicker('targetDate')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: colors.card, paddingVertical: s(buttonPadding.standard), borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                  className={`flex-row items-center px-4 ${radius.xl}`}
                >
                  <View className={`w-10 h-10 ${radius.lg} items-center justify-center mr-3`}>
                    <PickDateIcon size={s(iconSize.lg)} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                      {targetDate ? 'Change Date' : 'Pick a Date'}
                    </Text>
                    {targetDate && (
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                        Until {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {targetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </Text>
                    )}
                  </View>
                  <ChevronRightIcon size={s(iconSize.chevron)} color={colors.text} />
                </TouchableOpacity>
              </View>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* ── Block Behavior ── */}

        {/* Block Settings Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <Svg width={s(iconSize.toggleRow)} height={s(iconSize.toggleRow)} viewBox="0 0 24 24" fill={colors.text} style={{ marginRight: s(14) }}>
                <Path d="M22.12 21.46L2.4 1.73L1.12 3L4 5.87L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.34 4.5 11.67 4.5 12S4.53 12.65 4.57 12.97L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.03 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.38 18.72 15.83 18.45 16.26 18.14L20.85 22.73L22.12 21.46M12 15.5C10.07 15.5 8.5 13.93 8.5 12C8.5 11.5 8.62 11.08 8.79 10.67L13.33 15.21C12.92 15.39 12.5 15.5 12 15.5M11.74 8.53L8.56 5.35C8.75 5.25 8.93 5.15 9.13 5.07L9.5 2.42C9.54 2.18 9.75 2 10 2H14C14.25 2 14.46 2.18 14.5 2.42L14.87 5.07C15.5 5.32 16.04 5.66 16.56 6.05L19.05 5.05C19.27 4.96 19.54 5.05 19.66 5.27L21.66 8.73C21.78 8.95 21.73 9.22 21.54 9.37L19.43 11C19.47 11.34 19.5 11.67 19.5 12S19.47 12.65 19.43 12.97L21.54 14.63C21.73 14.78 21.78 15.05 21.66 15.27L20.5 17.29L15.47 12.26C15.5 12.18 15.5 12.09 15.5 12C15.5 10.07 13.93 8.5 12 8.5C11.91 8.5 11.83 8.5 11.74 8.53Z" />
              </Svg>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Block Settings App</Text>
                  <TouchableOpacity onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.blockSettings} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Essential settings remain accessible</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={blockSettings}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                if (value) {
                  AsyncStorage.getItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY).then(dismissed => {
                    if (dismissed !== 'true') {
                      setBlockSettingsWarningVisible(true);
                    } else {
                      setBlockSettings(true);
                    }
                  });
                } else {
                  setBlockSettings(false);
                }
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.blockSettings}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Prevents access to Android Settings during the block so that overlays and essential permissions cannot be disabled. Essential settings like WiFi or battery settings remain accessible via quick panel by sliding down from your phone.
              </Text>
            </View>
          </AnimatedInfoExpand>
        </View>

        {/* Strict Mode Toggle - hidden for no time limit presets */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
                <BoxiconsFilled name="bx-key" size={s(iconSize.toggleRow)} color={colors.text} style={{ marginRight: s(14) }} />
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Strict Mode</Text>
                    <TouchableOpacity onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.strictMode} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    Lock until timer ends or emergency tapout
                  </Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={strictMode}
                animate={!skipSwitchAnimation}
                onValueChange={(value: boolean) => {
                  if (value) {
                    AsyncStorage.getItem(STRICT_MODE_WARNING_DISMISSED_KEY).then(dismissed => {
                      if (dismissed !== 'true') {
                        setStrictModeWarningVisible(true);
                      } else {
                        setStrictMode(true);
                        setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
                      }
                    });
                  } else {
                    setStrictMode(false);
                    setAllowEmergencyTapout(false);
                  }
                }}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.strictMode}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Removes the ability to unlock in any way and to dismiss blocked apps or sites. ONLY EXITS: timer expiring or Emergency Tapout (if enabled). Pair with the block settings toggle for maximum strictness.
                </Text>
              </View>
            </AnimatedInfoExpand>
          </View>
        </ExpandableInfo>

        {/* Emergency Tapout Toggle */}
        <ExpandableInfo expanded={strictMode && !noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <View style={{ maxWidth: '75%' }} className="flex-row items-center">
<Animated.View style={{ marginRight: s(14), transform: [{ scale: tapoutHeartBeat }], opacity: tapoutHeartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                    <Svg width={s(iconSize.toggleRow)} height={s(iconSize.toggleRow)} viewBox="0 -960 960 960" fill={colors.red}>
                      <Path d="M595-468h-230q0 170 115 170t115-170ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM480-120l-58-50q-101-88-167-152T150-437q-39-51-54.5-94T80-620q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 89T810-437q-39 51-105 115T538-170l-58 50Z" />
                    </Svg>
                  </Animated.View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Allow Emergency Tapout</Text>
                    <TouchableOpacity onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                      <InfoIcon expanded={!!expandedInfo.emergencyTapout} color={colors.textSecondary} size={s(16)} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Use your emergency tapouts for this preset</Text>
                </View>
              </View>
              <AnimatedSwitch
                size="small"
                value={allowEmergencyTapout}
                animate={!skipSwitchAnimation}
                onValueChange={handleEmergencyTapoutToggle}
              />
            </View>
            <AnimatedInfoExpand expanded={!!expandedInfo.emergencyTapout}>
              <View className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
                </Text>
              </View>
            </AnimatedInfoExpand>
          </View>
        </ExpandableInfo>

        {/* Custom Overlay Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <View style={{ maxWidth: '75%' }} className="flex-row items-center">
              <BoxiconsFilled name="bx-magic-wand" size={s(iconSize.toggleRow)} color={colors.text} style={{ marginRight: s(14) }} />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Custom Overlay</Text>
                  <TouchableOpacity onPress={() => toggleInfo('customOverlay')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: s(6) }}>
                    <InfoIcon expanded={!!expandedInfo.customOverlay} color={colors.textSecondary} size={s(16)} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>Customize blocked screen text and image</Text>
              </View>
            </View>
            <AnimatedSwitch
              size="small"
              value={customOverlayEnabled}
              animate={!skipSwitchAnimation}
              onValueChange={(value: boolean) => {
                console.log('[OVERLAY] Toggle changed:', value);
                setCustomOverlayEnabled(value);
                if (!value) {
                  setCustomBlockedText('');
                  setCustomOverlayImage('');
                }
              }}
            />
          </View>
          <AnimatedInfoExpand expanded={!!expandedInfo.customOverlay}>
            <View className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                When enabled, the overlay that appears when opening a blocked app or website will show your custom message and/or image instead of the defaults.
              </Text>
            </View>
          </AnimatedInfoExpand>
          <ExpandableInfo expanded={customOverlayEnabled}>
            <View className="px-6 pb-4">
              {/* Custom blocked text */}
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold} mb-3`}>
                Blocked Message
              </Text>
              <TextInput
                value={customBlockedText}
                onChangeText={(text) => {
                  console.log('[OVERLAY] Text changed:', text);
                  setCustomBlockedText(text);
                }}
                placeholder="e.g. Stay focused! You got this."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                style={{
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  ...shadow.card,
                  padding: s(14),
                  minHeight: s(80),
                  textAlignVertical: 'top',
                  fontFamily: 'PlusJakartaSans-SemiBold',
                  fontSize: s(14),
                  borderRadius: s(12),
                }}
              />
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-2 text-right`}>
                {customBlockedText.length}/200
              </Text>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.dividerLight, marginVertical: s(16) }} />

              {/* Custom overlay image */}
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold} mb-3`}>
                Custom Image
              </Text>
              {customOverlayImage ? (
                <View className="items-center">
                  <View style={{ width: s(120), height: s(120) }}>
                    <TouchableOpacity onPress={handleImageUpload} disabled={imageUploading} activeOpacity={0.7}>
                      <Image
                        source={{ uri: customOverlayImage }}
                        style={{ width: s(120), height: s(120), borderRadius: s(12) }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        console.log('[OVERLAY] Image removed');
                        setCustomOverlayImage('');
                      }}
                      activeOpacity={0.7}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: s(12),
                      }}
                    >
                      <Svg width={s(iconSize.xl)} height={s(iconSize.xl)} viewBox="0 0 24 24" fill={colors.red}>
                        <Path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                        />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleImageUpload}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: s(999),
                      paddingHorizontal: s(14),
                      paddingVertical: s(8),
                      marginTop: s(10),
                    }}
                  >
                    <Text style={{ color: '#000000' }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                      {imageUploading ? 'Uploading...' : 'Change'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleImageUpload}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: s(999),
                    paddingHorizontal: s(16),
                    paddingVertical: s(12),
                    marginBottom: s(8),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BoxiconsFilled name="bx-image-sparkle" size={s(iconSize.sm)} color="#000000" style={{ marginRight: s(6) }} />
                  <Text style={{ color: '#000000' }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    {imageUploading ? 'Uploading...' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.dividerLight, marginVertical: s(16) }} />

              {/* Overlay Preview (phone mockup) */}
              <Text style={{ color: colors.textSecondary, marginBottom: s(10) }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>Preview</Text>
              <View style={{
                alignSelf: 'center',
                width: s(185),
                aspectRatio: 9 / 19.5,
                backgroundColor: colors.bg,
                borderRadius: s(20),
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: s(16),
                borderWidth: s(3),
                borderColor: '#3A3A3C',
              }}>
                {customOverlayImage ? (
                  <Image
                    source={{ uri: customOverlayImage }}
                    style={{ width: s(100), height: s(100), borderRadius: s(8), marginBottom: s(12) }}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialCommunityIcons name="android" size={s(100)} color="#FFFFFF" style={{ marginBottom: s(12) }} />
                )}
                <Text style={{
                  color: '#FFFFFF',
                  textAlign: 'center',
                  fontSize: s(11),
                  lineHeight: s(15),
                  letterSpacing: s(0.3),
                }} className={fontFamily.bold}>
                  {customBlockedText.trim() || 'This app is blocked.'}
                </Text>
                <Text style={{
                  color: '#9CA3AF',
                  fontSize: s(7),
                  marginTop: s(6),
                  letterSpacing: s(0.3),
                }} className={fontFamily.bold}>
                  Tap anywhere to dismiss
                </Text>
              </View>
            </View>
          </ExpandableInfo>
        </View>

        {/* Extra bottom padding */}
        <View style={{ height: s(40) }} />

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
        onCancel={() => {
          setDisableTapoutWarningVisible(false);
          setAllowEmergencyTapout(true);
        }}
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
        onCancel={() => {
          setBlockSettingsWarningVisible(false);
          setBlockSettings(false);
        }}
      />

      {/* Strict Mode Warning Modal */}
      <StrictModeWarningModal
        visible={strictModeWarningVisible}
        onConfirm={async (dontShowAgain) => {
          setStrictModeWarningVisible(false);
          setStrictMode(true);
          setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
          if (dontShowAgain) {
            await AsyncStorage.setItem(STRICT_MODE_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => {
          setStrictModeWarningVisible(false);
          setStrictMode(false);
          setAllowEmergencyTapout(false);
        }}
      />


    </View>
  );
}

export default memo(PresetSettingsScreen);
