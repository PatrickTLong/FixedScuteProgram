import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import HeaderIconButton from '../components/HeaderIconButton';
import BoxiconsFilled from '../components/BoxiconsFilled';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
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

// ============ Icon Components ============
const ChevronLeftIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-big-left" size={size} color={color} />
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#9CA3AF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-big-right" size={size} color={color} />
);

const XIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-x-circle" size={size} color={color} />
);

const CheckIcon = ({ size = iconSize.headerNav, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-check-circle" size={size} color={color} />
);

// ============ Sun/Moon Icons ============
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
    <View style={{ width: '14.28%', height: cellHeight }}>
      <TouchableOpacity
        onPress={() => onSelect(day)}
        disabled={!selectable}
        activeOpacity={0.7}
        style={{ flex: 1 }}
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
    </View>
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

// ============ DatePickerScreen ============
function DatePickerScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { getDatePickerParams, setDatePickerParams, setDatePickerResult } = usePresetSave();

  const scrollRef = useRef<ScrollView>(null);

  // Responsive sizes
  const timeItemHeight = s(BASE_TIME_ITEM_HEIGHT);
  const wheelWidth = s(50);
  const timeSelectedFontSize = s(24);
  const timeUnselectedFontSize = s(18);
  const dayCellHeight = s(44);

  // Date picker state
  const [target, setTarget] = useState<'targetDate' | 'scheduleStart' | 'scheduleEnd'>('targetDate');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');
  const [minimumDate, setMinimumDate] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize from params on focus
  useFocusEffect(
    useCallback(() => {
      const params = getDatePickerParams();
      if (!params) return;

      setTarget(params.target);

      const existingDate = params.existingDate ? new Date(params.existingDate) : null;
      const minDate = params.minimumDate ? new Date(params.minimumDate) : null;
      setMinimumDate(minDate);

      const dateToUse = existingDate || new Date();
      setViewMonth(dateToUse.getMonth());
      setViewYear(dateToUse.getFullYear());
      setTempSelectedDate(existingDate);

      if (existingDate) {
        const hours = existingDate.getHours();
        const minutes = existingDate.getMinutes();
        setSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
        setSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
        setSelectedMinute(minutes);
      } else {
        const now = new Date();
        const hours = now.getHours();
        setSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
        setSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
        setSelectedMinute(now.getMinutes());
      }

      setInitialized(true);

      // Handle Android back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancel();
        return true;
      });

      return () => {
        backHandler.remove();
        setInitialized(false);
      };
    }, [getDatePickerParams])
  );

  // Date constraints
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const max = new Date(today);
    max.setFullYear(max.getFullYear() + 1);
    return max;
  }, [today]);

  const effectiveMinDate = useMemo(() => {
    if (minimumDate && minimumDate > today) {
      return minimumDate;
    }
    return today;
  }, [minimumDate, today]);

  // Month navigation
  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  const canGoPrev = useMemo(() => {
    const prevDate = new Date(viewYear, viewMonth - 1, 1);
    return prevDate >= new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), 1);
  }, [viewYear, viewMonth, effectiveMinDate]);

  const canGoNext = useMemo(() => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    return nextDate <= maxDate;
  }, [viewYear, viewMonth, maxDate]);

  // Day selection
  const handleSelectDay = useCallback((day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    setTempSelectedDate(selected);
  }, [viewYear, viewMonth]);

  // Future date/time validation
  const isFutureDateTime = useMemo(() => {
    if (!tempSelectedDate) return false;

    let hours24 = selectedHour;
    if (selectedAmPm === 'PM' && selectedHour !== 12) {
      hours24 = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hours24 = 0;
    }

    const selectedDateTime = new Date(
      tempSelectedDate.getFullYear(),
      tempSelectedDate.getMonth(),
      tempSelectedDate.getDate(),
      hours24,
      selectedMinute,
      0
    );

    const now = new Date();
    return selectedDateTime > now && selectedDateTime > effectiveMinDate;
  }, [tempSelectedDate, selectedHour, selectedMinute, selectedAmPm, effectiveMinDate]);

  // Confirm handler
  const handleConfirm = useCallback(() => {
    if (!tempSelectedDate || !isFutureDateTime) return;

    let hours24 = selectedHour;
    if (selectedAmPm === 'PM' && selectedHour !== 12) {
      hours24 = selectedHour + 12;
    } else if (selectedAmPm === 'AM' && selectedHour === 12) {
      hours24 = 0;
    }

    const finalDate = new Date(
      tempSelectedDate.getFullYear(),
      tempSelectedDate.getMonth(),
      tempSelectedDate.getDate(),
      hours24,
      selectedMinute,
      0
    );

    setDatePickerResult({
      target,
      selectedDate: finalDate.toISOString(),
    });
    setDatePickerParams(null);
    navigation.navigate('PresetSettings');
  }, [tempSelectedDate, isFutureDateTime, selectedHour, selectedAmPm, selectedMinute, target, setDatePickerResult, setDatePickerParams, navigation]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setDatePickerParams(null);
    setDatePickerResult(null);
    navigation.navigate('PresetSettings');
  }, [navigation, setDatePickerParams, setDatePickerResult]);

  // Clear selection
  const handleClear = useCallback(() => {
    setTempSelectedDate(null);
  }, []);

  // Calendar data
  const daysInMonth = useMemo(() => getDaysInMonth(viewMonth, viewYear), [viewMonth, viewYear]);
  const firstDay = useMemo(() => getFirstDayOfMonth(viewMonth, viewYear), [viewMonth, viewYear]);

  const calendarDays = useMemo(() => {
    const days: ({ type: 'empty' } | { type: 'day'; day: number; selectable: boolean; selected: boolean; isToday: boolean })[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ type: 'empty' });
    }
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    const selectedDay = tempSelectedDate?.getDate();
    const selectedMonth = tempSelectedDate?.getMonth();
    const selectedYear = tempSelectedDate?.getFullYear();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(viewYear, viewMonth, i, 23, 59, 59, 999);
      days.push({
        type: 'day',
        day: i,
        selectable: date >= effectiveMinDate && date <= maxDate,
        selected: selectedDay === i && selectedMonth === viewMonth && selectedYear === viewYear,
        isToday: todayDate === i && todayMonth === viewMonth && todayYear === viewYear,
      });
    }
    return days;
  }, [daysInMonth, firstDay, viewMonth, viewYear, tempSelectedDate, effectiveMinDate, maxDate, today]);

  const selectedDateTimeText = useMemo(() => {
    if (!tempSelectedDate) return 'No date selected';
    const dateStr = tempSelectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = `${selectedHour}:${String(selectedMinute).padStart(2, '0')} ${selectedAmPm}`;
    return `${dateStr} at ${timeStr}`;
  }, [tempSelectedDate, selectedHour, selectedMinute, selectedAmPm]);

  // Header title
  const headerTitle = target === 'scheduleStart' ? 'Start Date' : target === 'scheduleEnd' ? 'End Date' : 'Date and Time';

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
        <HeaderIconButton onPress={handleCancel} style={{ width: s(40) }}>
          <XIcon size={s(iconSize.headerNav)} color="#FFFFFF" />
        </HeaderIconButton>
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>
            {headerTitle}
          </Text>
        </View>
        <HeaderIconButton
          onPress={handleConfirm}
          disabled={!isFutureDateTime}
          style={{ width: s(40) }}
          className="px-2 items-end"
        >
          <CheckIcon size={s(iconSize.headerNav)} color={isFutureDateTime ? '#FFFFFF' : colors.textMuted} />
        </HeaderIconButton>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingTop: s(16), paddingBottom: s(40), paddingHorizontal: s(24) }}
      >
        {/* Month/Year Navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={handlePrevMonth}
            disabled={!canGoPrev}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronLeftIcon size={s(iconSize.chevron)} color={canGoPrev ? colors.text : colors.textMuted} />
          </TouchableOpacity>

          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={!canGoNext}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronRightIcon size={s(iconSize.chevron)} color={canGoNext ? colors.text : colors.textMuted} />
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
          {calendarDays.map((cell, index) => {
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
                onSelect={handleSelectDay}
                cellHeight={dayCellHeight}
              />
            );
          })}
        </View>

        {/* Time Picker */}
        {tempSelectedDate && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.dividerLight, marginHorizontal: s(-24), paddingHorizontal: s(24), paddingVertical: s(buttonPadding.standard) }} className="mt-6">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-3`}>
              Time
            </Text>
            <View className="flex-row items-center justify-center">
              <TimeWheel
                values={HOURS_12}
                selectedValue={selectedHour}
                onValueChange={setSelectedHour}
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
                selectedValue={selectedMinute}
                onValueChange={setSelectedMinute}
                padZero={true}
                textColor={colors.text}
                textMutedColor={colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)'}
                itemHeight={timeItemHeight}
                wheelWidth={wheelWidth}
                selectedFontSize={timeSelectedFontSize}
                unselectedFontSize={timeUnselectedFontSize}
              />
              <AmPmSelector
                value={selectedAmPm}
                onChange={setSelectedAmPm}
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
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>{selectedDateTimeText}</Text>
            </View>
            {tempSelectedDate && (
              <TouchableOpacity
                onPress={handleClear}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                className={`ml-4 px-4 py-2 ${radius.full}`}
              >
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {tempSelectedDate && !isFutureDateTime && (
            <Text style={{ color: colors.red }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-2`}>
              Please select a future date and time
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

export default memo(DatePickerScreen);
