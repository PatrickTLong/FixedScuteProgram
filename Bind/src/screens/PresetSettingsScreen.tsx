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
import AnimatedSwitch from '../components/AnimatedSwitch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import TimerPicker from '../components/TimerPicker';
import ScheduleInfoModal from '../components/ScheduleInfoModal';
import InfoModal from '../components/InfoModal';
import DisableTapoutWarningModal from '../components/DisableTapoutWarningModal';
import BlockSettingsWarningModal from '../components/BlockSettingsWarningModal';
import RecurrenceInfoModal from '../components/RecurrenceInfoModal';
import StrictModeWarningModal from '../components/StrictModeWarningModal';
import { Preset } from '../components/PresetCard';
import HeaderIconButton from '../components/HeaderIconButton';
import { useAuth } from '../context/AuthContext';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap, mediumTap } from '../utils/haptics';
import { usePresetSave } from '../navigation/PresetsStack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';

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
const ChevronLeftIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
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

const ArrowLeftIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
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

const FileIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
    />
  </Svg>
);

const CheckIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3a.75.75 0 0 1 1.5 0v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z"
    />
  </Svg>
);

const FlagIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054a8.25 8.25 0 0 0 5.58.652l3.109-.732a.75.75 0 0 1 .89.75v12.173a.75.75 0 0 1-.579.732l-3.474.819a9.75 9.75 0 0 1-6.591-.77l-.108-.054a8.25 8.25 0 0 0-5.69-.625l-1.808.452V21a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Z"
    />
  </Svg>
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#9CA3AF" }: { size?: number; color?: string }) => (
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

const SunIcon = ({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
  </Svg>
);

const MoonIcon = ({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
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

const SendIcon = ({ size = iconSize.forTabs, color = '#FFFFFF' }: { size?: number; color?: string }) => (
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
const TIME_WINDOW_BUFFER = 8;
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

  const selectedIndex = values.indexOf(selectedValue);
  const [windowStart, setWindowStart] = useState(() => Math.max(0, selectedIndex - TIME_WINDOW_BUFFER));
  const [windowEnd, setWindowEnd] = useState(() => Math.min(values.length - 1, selectedIndex + TIME_WINDOW_BUFFER));

  const windowedValues = useMemo(() => values.slice(windowStart, windowEnd + 1), [values, windowStart, windowEnd]);
  const topSpacerHeight = windowStart * itemHeight;
  const bottomSpacerHeight = (values.length - 1 - windowEnd) * itemHeight;

  useEffect(() => {
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
      }, 10);
    }
  }, [selectedValue, values, itemHeight]);

  const updateWindow = useCallback((centerIndex: number) => {
    const newStart = Math.max(0, centerIndex - TIME_WINDOW_BUFFER);
    const newEnd = Math.min(values.length - 1, centerIndex + TIME_WINDOW_BUFFER);
    setWindowStart(prev => prev !== newStart ? newStart : prev);
    setWindowEnd(prev => prev !== newEnd ? newEnd : prev);
  }, [values.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;
    updateWindow(clampedIndex);
  }, [values.length, itemHeight, updateWindow]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }
  }, [values, selectedValue, onValueChange, itemHeight]);

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
          if (e.nativeEvent.velocity?.y === 0) handleScrollEnd(e);
        }}
        contentContainerStyle={{ paddingVertical }}
        nestedScrollEnabled={false}
        overScrollMode="never"
      >
        {topSpacerHeight > 0 && <View style={{ height: topSpacerHeight }} />}
        {windowedValues.map((value) => {
          const isSelected = value === selectedValue;
          return (
            <View key={value} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
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
      onPressIn={lightTap}
      onPress={() => onSelect(day)}
      disabled={!selectable}
      activeOpacity={0.7}
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
      {/* AM button with sun icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPressIn={lightTap}
          onPress={() => onChange('AM')}
          activeOpacity={0.7}
          style={{ backgroundColor: value === 'AM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'AM' ? colors.green : colors.border, ...shadow.card }}
          className={`px-3 py-2 ${radius.AMPM}`}
        >
          <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
            AM
          </Text>
        </TouchableOpacity>
        <View style={{ position: 'absolute', right: -26 }}>
          <SunIcon size={18} color={value === 'AM' ? colors.yellow : colors.textMuted} />
        </View>
      </View>
      {/* PM button with moon icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <TouchableOpacity
          onPressIn={lightTap}
          onPress={() => onChange('PM')}
          activeOpacity={0.7}
          style={{ backgroundColor: value === 'PM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'PM' ? colors.green : colors.border, ...shadow.card }}
          className={`px-3 py-2 ${radius.AMPM}`}
        >
          <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
            PM
          </Text>
        </TouchableOpacity>
        <View style={{ position: 'absolute', right: -26 }}>
          <MoonIcon size={18} color={value === 'PM' ? colors.text : colors.textMuted} />
        </View>
      </View>
    </View>
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
  const lastHapticIndex = useRef(-1);
  const scrolledByUser = useRef(false);

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
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
      }, 10);
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

    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;
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
  const numberWheelWidth = s(60);
  const unitWheelWidth = s(100);
  const textMutedColor = colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)';
  const selectedFontSize = s(22);
  const unselectedFontSize = s(16);

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

// ============ Navigation Types ============
type PresetSettingsNavigationProp = BottomTabNavigationProp<MainTabParamList, 'PresetSettings'>;

// ============ Main Screen Component ============
function PresetSettingsScreen() {
  const navigation = useNavigation<PresetSettingsNavigationProp>();
  const { onSave, getEditingPreset, getExistingPresets, getEmail, getPresetSettingsParams, setPresetSettingsParams, getFinalSettingsState, setFinalSettingsState } = usePresetSave();
  const paramsSnapshot = getPresetSettingsParams();
  const name = paramsSnapshot?.name ?? '';
  const selectedApps = paramsSnapshot?.selectedApps ?? [];
  const blockedWebsites = paramsSnapshot?.blockedWebsites ?? [];
  const installedApps = paramsSnapshot?.installedApps ?? [];
  const iosSelectedAppsCount = paramsSnapshot?.iosSelectedAppsCount ?? 0;
  const { tapoutStatus } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();

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
  const hasSaved = useRef(false);
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
  const dpScrollRef = useRef<ScrollView>(null);

  // Refs to track current form state for saving on blur
  const blockSettingsRef = useRef(blockSettings);
  const noTimeLimitRef = useRef(noTimeLimit);
  const timerDaysRef = useRef(timerDays);
  const timerHoursRef = useRef(timerHours);
  const timerMinutesRef = useRef(timerMinutes);
  const timerSecondsRef = useRef(timerSeconds);
  const targetDateRef = useRef(targetDate);
  const allowEmergencyTapoutRef = useRef(allowEmergencyTapout);
  const strictModeRef = useRef(strictMode);
  const isScheduledRef = useRef(isScheduled);
  const scheduleStartDateRef = useRef(scheduleStartDate);
  const scheduleEndDateRef = useRef(scheduleEndDate);
  const isRecurringRef = useRef(isRecurring);
  const recurringValueRef = useRef(recurringValue);
  const recurringUnitRef = useRef(recurringUnit);

  // Keep refs in sync with state
  blockSettingsRef.current = blockSettings;
  noTimeLimitRef.current = noTimeLimit;
  timerDaysRef.current = timerDays;
  timerHoursRef.current = timerHours;
  timerMinutesRef.current = timerMinutes;
  timerSecondsRef.current = timerSeconds;
  targetDateRef.current = targetDate;
  allowEmergencyTapoutRef.current = allowEmergencyTapout;
  strictModeRef.current = strictMode;
  isScheduledRef.current = isScheduled;
  scheduleStartDateRef.current = scheduleStartDate;
  scheduleEndDateRef.current = scheduleEndDate;
  isRecurringRef.current = isRecurring;
  recurringValueRef.current = recurringValue;
  recurringUnitRef.current = recurringUnit;

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
        setTargetDate(savedState.targetDate ? new Date(savedState.targetDate) : null);
        setAllowEmergencyTapout(savedState.allowEmergencyTapout);
        setStrictMode(savedState.strictMode);
        setIsScheduled(savedState.isScheduled);
        setScheduleStartDate(savedState.scheduleStartDate ? new Date(savedState.scheduleStartDate) : null);
        setScheduleEndDate(savedState.scheduleEndDate ? new Date(savedState.scheduleEndDate) : null);
        setIsRecurring(savedState.isRecurring);
        setRecurringValue(savedState.recurringValue);
        setRecurringUnit(savedState.recurringUnit);
      } else {
        const editingPreset = getEditingPreset();
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
      }
      // Reset UI state
      hasSaved.current = false;
      setShowDatePicker(false);
      setDatePickerTarget(null);
      setExpandedInfo({});

      // Save form state to context when screen loses focus (user taps back)
      return () => {
        setFinalSettingsState({
          blockSettings: blockSettingsRef.current,
          noTimeLimit: noTimeLimitRef.current,
          timerDays: timerDaysRef.current,
          timerHours: timerHoursRef.current,
          timerMinutes: timerMinutesRef.current,
          timerSeconds: timerSecondsRef.current,
          targetDate: targetDateRef.current ? targetDateRef.current.toISOString() : null,
          allowEmergencyTapout: allowEmergencyTapoutRef.current,
          strictMode: strictModeRef.current,
          isScheduled: isScheduledRef.current,
          scheduleStartDate: scheduleStartDateRef.current ? scheduleStartDateRef.current.toISOString() : null,
          scheduleEndDate: scheduleEndDateRef.current ? scheduleEndDateRef.current.toISOString() : null,
          isRecurring: isRecurringRef.current,
          recurringValue: recurringValueRef.current,
          recurringUnit: recurringUnitRef.current,
        });
      };
    }, [getEditingPreset, getFinalSettingsState, setFinalSettingsState])
  );

  // ============ Emergency Tapout Handler ============
  const handleEmergencyTapoutToggle = useCallback((value: boolean) => {
    mediumTap();

    if (value) {
      if ((tapoutStatus?.remaining ?? 0) <= 0) {
        setNoTapoutsModalVisible(true);
      } else {
        setAllowEmergencyTapout(true);
      }
    } else {
      setAllowEmergencyTapout(false);
      AsyncStorage.getItem(DISABLE_TAPOUT_WARNING_DISMISSED_KEY).then(dismissed => {
        if (dismissed !== 'true') {
          setDisableTapoutWarningVisible(true);
        }
      });
    }
  }, [tapoutStatus]);

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
    if (dpViewMonth === 0) {
      setDpViewMonth(11);
      setDpViewYear(y => y - 1);
    } else {
      setDpViewMonth(m => m - 1);
    }
  }, [dpViewMonth]);

  const dpHandleNextMonth = useCallback(() => {
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
    setShowDatePicker(false);
    setDatePickerTarget(null);
  }, []);

  const dpHandleClear = useCallback(() => {
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
    };

    // Navigate immediately — save happens in the background
    setFinalSettingsState(null);
    setPresetSettingsParams(null);
    navigation.navigate({ name: 'Presets' } as any);
    onSave(newPreset);
  }, [name, canSave, getEditingPreset, getExistingPresets, installedSelectedApps, blockedWebsites, blockSettings, noTimeLimit, timerDays, timerHours, timerMinutes, timerSeconds, targetDate, onSave, allowEmergencyTapout, strictMode, isScheduled, scheduleStartDate, scheduleEndDate, isRecurring, recurringValue, recurringUnit, navigation, setFinalSettingsState]);

  // ============ Full-Screen Date Picker Overlay ============
  const renderDatePickerOverlay = () => {
    return (
      <Modal
        visible={showDatePicker}
        animationType="none"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={dpHandleCancel}
      >
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {/* Date Picker Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
          <HeaderIconButton onPress={dpHandleCancel} style={{ width: s(40) }}>
            <XIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
          </HeaderIconButton>
          <View className="flex-row items-center">
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>
              {datePickerTarget === 'scheduleStart' ? 'Start Date' : datePickerTarget === 'scheduleEnd' ? 'End Date' : 'Date and Time'}
            </Text>
            {datePickerTarget === 'scheduleStart' && (
              <View style={{ marginLeft: s(8) }}>
                <CalendarIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
              </View>
            )}
            {datePickerTarget === 'scheduleEnd' && (
              <View style={{ marginLeft: s(8) }}>
                <FlagIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
              </View>
            )}
          </View>
          <HeaderIconButton
            onPress={dpHandleConfirm}
            disabled={!dpIsFutureDateTime}
            style={{ width: s(40) }}
            className="px-2 items-end"
          >
            <CheckIcon size={s(iconSize.headerNav)} color={dpIsFutureDateTime ? '#FFFFFF' : colors.textMuted} />
          </HeaderIconButton>
        </View>

        <ScrollView
          ref={dpScrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingTop: s(16), paddingBottom: s(40), paddingHorizontal: s(24) }}
        >
          {/* Month/Year Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={dpHandlePrevMonth}
              disabled={!dpCanGoPrev}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-10 h-10 items-center justify-center"
            >
              <ChevronLeftIcon size={s(iconSize.chevron)} color={dpCanGoPrev ? colors.text : colors.textMuted} />
            </TouchableOpacity>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
              {MONTHS[dpViewMonth]} {dpViewYear}
            </Text>

            <TouchableOpacity
              onPressIn={lightTap}
              onPress={dpHandleNextMonth}
              disabled={!dpCanGoNext}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-10 h-10 items-center justify-center"
            >
              <ChevronRightIcon size={s(iconSize.chevron)} color={dpCanGoNext ? colors.text : colors.textMuted} />
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
            <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight, marginHorizontal: s(-24), paddingHorizontal: s(24), paddingVertical: s(buttonPadding.standard) }} className="mt-6">
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-3`}>
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
                  <Text style={{ color: colors.text, fontSize: s(24) }} className={fontFamily.regular}>:</Text>
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
                />
              </View>
            </View>
          )}

          {/* Selected Date/Time Display */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight, marginHorizontal: s(-24), paddingHorizontal: s(24), paddingVertical: s(buttonPadding.standard) }} className="mt-6">
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.regular} mb-1`}>Selected</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>{dpSelectedDateTimeText}</Text>
              </View>
              {dpTempSelectedDate && (
                <TouchableOpacity
                  onPressIn={lightTap}
                  onPress={dpHandleClear}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

        </ScrollView>
      </View>
      </Modal>
    );
  };

  // ============ Render ============
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header — key forces SVG remount on focus to fix react-freeze stroke color bug */}
      <View key={svgKey} style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={() => navigation.navigate('EditPresetApps')} style={{ width: s(40) }}>
          <ArrowLeftIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Final Settings</Text>
        <HeaderIconButton onPress={handleSave} disabled={!canSave} style={{ width: s(40) }}>
          <FileIcon size={s(iconSize.headerNav)} color={canSave ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <ScrollView ref={mainScrollRef} className="flex-1 pt-6" contentContainerStyle={{ paddingBottom: s(100) }}>

        <Text style={{ color: colors.text }} className={`${textSize.extraSmall} ${fontFamily.regular} px-6 mb-4`}>
          Tap on toggle text to see further details
        </Text>

        {/* ── Time & Duration ── */}

        {/* No Time Limit Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>No Time Limit</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Block until manually unlocked</Text>
            </TouchableOpacity>
            <AnimatedSwitch
              size="small"
              value={noTimeLimit}
              onValueChange={(value: boolean) => {
                setNoTimeLimit(value);
                requestAnimationFrame(() => {
                  if (value) {
                    setTimerDays(0);
                    setTimerHours(0);
                    setTimerMinutes(0);
                    setTimerSeconds(0);
                    setTargetDate(null);
                    setIsScheduled(false);
                    setScheduleStartDate(null);
                    setScheduleEndDate(null);
                    setStrictMode(false);
                    setAllowEmergencyTapout(false);
                  }
                  mediumTap();
                });
              }}
            />
          </View>
          <ExpandableInfo expanded={!!expandedInfo.noTimeLimit}>
            <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('noTimeLimit')} activeOpacity={0.7} className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Block stays active until manually ended via home screen for No Time Limit Presets.
              </Text>
            </TouchableOpacity>
          </ExpandableInfo>
        </View>

        {/* Schedule for Later Toggle */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('schedule')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Schedule for Later</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Set a future start and end time, with optional recurrence</Text>
              </TouchableOpacity>
              <AnimatedSwitch
                size="small"
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
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('schedule')} activeOpacity={0.7} className="px-6 pb-4">
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
              onPressIn={lightTap}
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
                  onPressIn={lightTap}
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
              onPressIn={lightTap}
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
                  onPressIn={lightTap}
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

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, marginTop: s(20), marginHorizontal: s(-24) }} />

            {/* Recurring Schedule - only when both dates are valid */}
            {scheduleStartDate && scheduleEndDate && scheduleEndDate > scheduleStartDate && (
              <View style={{ marginHorizontal: s(-24) }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
                  <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
                    <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('recurring')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                      <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Recurring Schedule</Text>
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Repeat this block automatically</Text>
                    </TouchableOpacity>
                    <AnimatedSwitch
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
                  <ExpandableInfo expanded={!!expandedInfo.recurring}>
                    <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('recurring')} activeOpacity={0.7} className="px-6 pb-4">
                      <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                        Automatically repeats this blocking session at the interval you choose. After each session ends, the next one will start based on your selected frequency.
                      </Text>
                    </TouchableOpacity>
                  </ExpandableInfo>
                </View>

                {/* Recurring Options */}
                <View style={!isRecurring ? { height: 0, overflow: 'hidden' } : undefined}>
                  <View
                    style={{ paddingBottom: s(20) }}
                    className="mt-4 px-6"
                  >
                    <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-4`}>
                      Recurrence
                    </Text>

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
                  <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }} />
                </View>
              </View>
            )}
          </View>
        </ExpandableInfo>

        {/* Timer Picker (if time limit enabled and not scheduled) */}
        <View style={noTimeLimit || isScheduled ? { height: 0, overflow: 'hidden' } : undefined}>
          <View className="mt-6 px-6">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-4`}>
              Fixed Time
            </Text>
            <TimerPicker
              days={timerDays}
              hours={timerHours}
              minutes={timerMinutes}
              seconds={timerSeconds}
              onDaysChange={setTimerDays}
              onHoursChange={setTimerHours}
              onMinutesChange={setTimerMinutes}
              onSecondsChange={setTimerSeconds}
              parentScrollRef={mainScrollRef}
            />

            {/* Or Pick a Date Divider */}
            <View className="flex-row items-center my-6 -mx-6">
              <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
              <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} px-4`}>or</Text>
              <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
            </View>

            {/* Pick a Date Button */}
            <TouchableOpacity
              onPressIn={lightTap}
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
                  onPressIn={lightTap}
                  onPress={() => setTargetDate(null)}
                  hitSlop={{ top: s(10), bottom: s(10), left: s(10), right: s(10) }}
                >
                  <XIcon size={s(iconSize.sm)} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <ChevronRightIcon size={s(iconSize.chevron)} color={colors.text} />
              )}
            </TouchableOpacity>

            {/* Date picker rendered as full-screen overlay */}

          </View>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, marginTop: s(16) }} />
        </View>

        {/* ── Block Behavior ── */}

        {/* Block Settings Toggle */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
          <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
            <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Block Settings App</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Essential settings remain accessible</Text>
            </TouchableOpacity>
            <AnimatedSwitch
              size="small"
              value={blockSettings}
              onValueChange={(value: boolean) => {
                mediumTap();
                setBlockSettings(value);
                if (value) {
                  AsyncStorage.getItem(BLOCK_SETTINGS_WARNING_DISMISSED_KEY).then(dismissed => {
                    if (dismissed !== 'true') {
                      setBlockSettingsWarningVisible(true);
                    }
                  });
                }
              }}
            />
          </View>
          <ExpandableInfo expanded={!!expandedInfo.blockSettings}>
            <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('blockSettings')} activeOpacity={0.7} className="px-6 pb-4">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                Prevents access to Android Settings during the block so that overlays and essential permissions cannot be disabled. Essential settings like WiFi or battery settings remain accessible via quick panel by sliding down from your phone.
              </Text>
            </TouchableOpacity>
          </ExpandableInfo>
        </View>

        {/* Strict Mode Toggle - hidden for no time limit presets */}
        <ExpandableInfo expanded={!noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Strict Mode</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  Lock until timer ends or emergency tapout
                </Text>
              </TouchableOpacity>
              <AnimatedSwitch
                size="small"
                value={strictMode}
                onValueChange={(value: boolean) => {
                  mediumTap();
                  setStrictMode(value);
                  if (value) {
                    setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
                    AsyncStorage.getItem(STRICT_MODE_WARNING_DISMISSED_KEY).then(dismissed => {
                      if (dismissed !== 'true') {
                        setStrictModeWarningVisible(true);
                      }
                    });
                  } else {
                    setAllowEmergencyTapout(false);
                  }
                }}
              />
            </View>
            <ExpandableInfo expanded={!!expandedInfo.strictMode}>
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('strictMode')} activeOpacity={0.7} className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Removes the ability to unlock in any way and to dismiss blocked apps or sites. ONLY EXITS: timer expiring or Emergency Tapout (if enabled). Pair with the block settings toggle for maximum strictness.
                </Text>
              </TouchableOpacity>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* Emergency Tapout Toggle */}
        <ExpandableInfo expanded={strictMode && !noTimeLimit} lazy>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight }}>
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-6">
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} style={{ maxWidth: '75%' }}>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>Allow Emergency Tapout</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Use your emergency tapouts for this preset</Text>
              </TouchableOpacity>
              <AnimatedSwitch
                size="small"
                value={allowEmergencyTapout}
                onValueChange={handleEmergencyTapoutToggle}
              />
            </View>
            <ExpandableInfo expanded={!!expandedInfo.emergencyTapout}>
              <TouchableOpacity onPressIn={lightTap} onPress={() => toggleInfo('emergencyTapout')} activeOpacity={0.7} className="px-6 pb-4">
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular} leading-5`}>
                  Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
                </Text>
              </TouchableOpacity>
            </ExpandableInfo>
          </View>
        </ExpandableInfo>

        {/* Extra bottom padding */}
        <View style={{ height: s(40) }} />

      </ScrollView>

      {/* Full-screen date picker overlay */}
      {renderDatePickerOverlay()}

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
          setAllowEmergencyTapout((tapoutStatus?.remaining ?? 0) > 0);
          if (dontShowAgain) {
            await AsyncStorage.setItem(STRICT_MODE_WARNING_DISMISSED_KEY, 'true');
          }
        }}
        onCancel={() => setStrictModeWarningVisible(false)}
      />

    </View>
  );
}

export default memo(PresetSettingsScreen);
