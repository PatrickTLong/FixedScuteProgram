import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTap } from '../utils/haptics';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import Svg, { Path } from 'react-native-svg';

const ChevronRightIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
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

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onSelect: (date: Date) => void;
  minimumDate?: Date | null; // Optional minimum date (must select after this date)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Time picker constants
const BASE_TIME_ITEM_HEIGHT = 40;
const TIME_VISIBLE_ITEMS = 3;
const TIME_WINDOW_BUFFER = 4;
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
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
                  color: isSelected ? textColor : textMutedColor,
                }}
                className={isSelected ? fontFamily.bold : fontFamily.regular}
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

const DayCell = memo(({ day, selectable, selected, isToday: todayDay, textColor, textMutedColor, onSelect, cellHeight }: DayCellProps) => {
  const { colors } = useTheme();
  return (
  <TouchableOpacity
    onPressIn={lightTap}
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

// AM/PM Selector
interface AmPmSelectorProps {
  value: 'AM' | 'PM';
  onChange: (value: 'AM' | 'PM') => void;
  greenColor: string;
  cardColor: string;
  textMutedColor: string;
}

const AmPmSelector = memo(({ value, onChange, greenColor, cardColor, textMutedColor }: AmPmSelectorProps) => {
  const { colors } = useTheme();
  return (
  <View className="ml-2">
    <TouchableOpacity
      onPressIn={lightTap}
      onPress={() => onChange('AM')}
      style={{ backgroundColor: value === 'AM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'AM' ? colors.green : colors.border, ...shadow.card }}
      className={`px-3 py-2 ${radius.lg}`}
    >
      <Text style={{ color: value === 'AM' ? colors.text : textMutedColor }} className={`${textSize.base} ${fontFamily.semibold}`}>
        AM
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPressIn={lightTap}
      onPress={() => onChange('PM')}
      style={{ backgroundColor: value === 'PM' ? colors.green : cardColor, borderWidth: 1, borderColor: value === 'PM' ? colors.green : colors.border, ...shadow.card }}
      className={`px-3 py-2 ${radius.lg} mt-1`}
    >
      <Text style={{ color: value === 'PM' ? colors.text : textMutedColor }} className={`${textSize.base} ${fontFamily.semibold}`}>
        PM
      </Text>
    </TouchableOpacity>
  </View>
  );
});

function DatePickerModal({ visible, selectedDate, onClose, onSelect, minimumDate }: DatePickerModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const timeItemHeight = s(BASE_TIME_ITEM_HEIGHT);
  const wheelWidth = s(50);
  const dayCellHeight = s(44);
  const timeSelectedFontSize = s(24);
  const timeUnselectedFontSize = s(18);
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const max = new Date(today);
    max.setFullYear(max.getFullYear() + 1);
    return max;
  }, [today]);

  // Effective minimum date is either the provided minimumDate or today, whichever is later
  const effectiveMinDate = useMemo(() => {
    if (!minimumDate) return today;
    return minimumDate > today ? minimumDate : today;
  }, [minimumDate, today]);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(selectedDate);

  // Time state
  const [selectedHour, setSelectedHour] = useState(12); // 1-12
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const dateToUse = selectedDate || today;
      setViewMonth(dateToUse.getMonth());
      setViewYear(dateToUse.getFullYear());
      setTempSelectedDate(selectedDate);

      // Initialize time from selectedDate
      if (selectedDate) {
        const hours = selectedDate.getHours();
        const minutes = selectedDate.getMinutes();
        setSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
        setSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
        setSelectedMinute(minutes);
      } else {
        // Default to current time
        const now = new Date();
        const hours = now.getHours();
        setSelectedAmPm(hours >= 12 ? 'PM' : 'AM');
        setSelectedHour(hours % 12 === 0 ? 12 : hours % 12);
        setSelectedMinute(now.getMinutes());
      }
    }
  }, [visible, selectedDate, today]);

  const getDaysInMonth = useCallback((month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

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

  const handleSelectDay = useCallback((day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    setTempSelectedDate(selected);
  }, [viewYear, viewMonth]);

  // Check if selected datetime is valid (after minimum date and in the future)
  const isFutureDateTime = useMemo(() => {
    if (!tempSelectedDate) return false;

    // Convert 12-hour to 24-hour
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

    // Must be after both current time and effectiveMinDate
    const now = new Date();
    return selectedDateTime > now && selectedDateTime > effectiveMinDate;
  }, [tempSelectedDate, selectedHour, selectedMinute, selectedAmPm, effectiveMinDate]);

  const handleConfirm = useCallback(() => {
    if (tempSelectedDate && isFutureDateTime) {
      // Convert 12-hour to 24-hour
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
      onSelect(finalDate);
      handleClose();
    }
    // Don't close if the date is not in the future - user needs to select a valid time
  }, [tempSelectedDate, selectedHour, selectedMinute, selectedAmPm, onSelect, handleClose, isFutureDateTime]);

  const handleClear = useCallback(() => {
    setTempSelectedDate(null);
  }, []);

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  // Build calendar grid with pre-computed metadata for each day
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

  // Format selected date and time for display
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

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }} className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPressIn={lightTap} onPress={handleClose} className="px-2">
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.regular}`}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.semibold}`}>Pick Date and Time</Text>
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={handleConfirm}
              disabled={!isFutureDateTime}
              className="px-2"
            >
              <Text style={{ color: isFutureDateTime ? colors.text : colors.textMuted }} className={`${textSize.base} ${fontFamily.semibold}`}>
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
              onPressIn={lightTap}
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              className="w-10 h-10 items-center justify-center"
            >
              <ChevronLeftIcon size={s(16)} color={canGoPrev ? colors.text : colors.textMuted} />
            </TouchableOpacity>

            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.semibold}`}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPressIn={lightTap}
              onPress={handleNextMonth}
              disabled={!canGoNext}
              className="w-10 h-10 items-center justify-center"
            >
              <ChevronRightIcon size={s(16)} color={canGoNext ? colors.text : colors.textMuted} />
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
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, marginHorizontal: s(-24), paddingHorizontal: s(24), paddingVertical: s(buttonPadding.standard) }}>
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
                  <Text style={{ color: colors.textMuted, fontSize: s(24) }}>:</Text>
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
                  greenColor={colors.green}
                  cardColor={colors.card}
                  textMutedColor={colors.textSecondary}
                />
              </View>
            </View>
          )}

          {/* Selected Date/Time Display */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, marginHorizontal: s(-24), paddingHorizontal: s(24), paddingVertical: s(buttonPadding.standard) }}>
            <View className="flex-row justify-between items-center">
              <View>
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.regular} mb-1`}>Selected</Text>
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>{selectedDateTimeText}</Text>
              </View>
              {/* Clear Button - centered with text block */}
              {tempSelectedDate && (
                <TouchableOpacity
                  onPressIn={lightTap}
                  onPress={handleClear}
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

          </View>
          </SafeAreaView>
      </View>
      </View>
    </Modal>
  );
}

export default memo(DatePickerModal);
