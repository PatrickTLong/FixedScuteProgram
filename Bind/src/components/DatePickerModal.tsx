import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

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
const TIME_ITEM_HEIGHT = 40;
const TIME_VISIBLE_ITEMS = 3;
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
}

const TimeWheel = memo(({ values, selectedValue, onValueChange, padZero = true, textColor, textMutedColor }: TimeWheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastHapticIndex = useRef(-1); // Track last index for haptic feedback

  useEffect(() => {
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: index * TIME_ITEM_HEIGHT,
          animated: false,
        });
      }, 10);
    }
  }, [selectedValue, values]);

  // Handle scroll to trigger haptic on each number passed
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    // Trigger haptic when passing a new number
    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;
  }, [values.length]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / TIME_ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }

    scrollRef.current?.scrollTo({
      y: clampedIndex * TIME_ITEM_HEIGHT,
      animated: true,
    });
  }, [values, selectedValue, onValueChange]);

  const paddingVertical = (TIME_ITEM_HEIGHT * (TIME_VISIBLE_ITEMS - 1)) / 2;

  return (
    <View style={{ height: TIME_ITEM_HEIGHT * TIME_VISIBLE_ITEMS, width: 50, overflow: 'hidden' }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={TIME_ITEM_HEIGHT}
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
        nestedScrollEnabled
      >
        {values.map((value) => {
          const isSelected = value === selectedValue;
          return (
            <View
              key={value}
              style={{
                height: TIME_ITEM_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: isSelected ? 24 : 18,
                  fontFamily: isSelected ? 'Nunito-Bold' : 'Nunito-Regular',
                  color: isSelected ? textColor : textMutedColor,
                }}
              >
                {padZero ? String(value).padStart(2, '0') : value}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

// AM/PM Selector
interface AmPmSelectorProps {
  value: 'AM' | 'PM';
  onChange: (value: 'AM' | 'PM') => void;
  greenColor: string;
  cardColor: string;
  textMutedColor: string;
}

const AmPmSelector = memo(({ value, onChange, greenColor, cardColor, textMutedColor }: AmPmSelectorProps) => (
  <View className="ml-2">
    <TouchableOpacity
      onPress={() => { lightTap(); onChange('AM'); }}
      style={{ backgroundColor: value === 'AM' ? greenColor : cardColor }}
      className="px-3 py-2 rounded-lg"
    >
      <Text style={{ color: value === 'AM' ? '#000000' : textMutedColor }} className="text-base font-nunito-semibold">
        AM
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => { lightTap(); onChange('PM'); }}
      style={{ backgroundColor: value === 'PM' ? greenColor : cardColor }}
      className="px-3 py-2 rounded-lg mt-1"
    >
      <Text style={{ color: value === 'PM' ? '#000000' : textMutedColor }} className="text-base font-nunito-semibold">
        PM
      </Text>
    </TouchableOpacity>
  </View>
));

function DatePickerModal({ visible, selectedDate, onClose, onSelect, minimumDate }: DatePickerModalProps) {
  const { colors } = useTheme();
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
    lightTap();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    lightTap();
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

  const isDateSelectable = useCallback((day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(23, 59, 59, 999);
    return date >= effectiveMinDate && date <= maxDate;
  }, [viewYear, viewMonth, effectiveMinDate, maxDate]);

  const isDateSelected = useCallback((day: number) => {
    if (!tempSelectedDate) return false;
    return (
      tempSelectedDate.getDate() === day &&
      tempSelectedDate.getMonth() === viewMonth &&
      tempSelectedDate.getFullYear() === viewYear
    );
  }, [tempSelectedDate, viewMonth, viewYear]);

  const isToday = useCallback((day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  }, [today, viewMonth, viewYear]);

  const handleSelectDay = useCallback((day: number) => {
    if (!isDateSelectable(day)) return;
    lightTap(); // Haptic feedback when selecting a day
    // Keep the time when selecting a new day
    const selected = new Date(viewYear, viewMonth, day);
    setTempSelectedDate(selected);
  }, [viewYear, viewMonth, isDateSelectable]);

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
      onClose();
    }
    // Don't close if the date is not in the future - user needs to select a valid time
  }, [tempSelectedDate, selectedHour, selectedMinute, selectedAmPm, onSelect, onClose, isFutureDateTime]);

  const handleClear = useCallback(() => {
    setTempSelectedDate(null);
    onSelect(null as any);
    onClose();
  }, [onSelect, onClose]);

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDay]);

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
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3 border-b">
          <TouchableOpacity onPress={onClose} className="px-2">
            <Text style={{ color: colors.green }} className="text-base font-nunito">Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Pick Date & Time</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!isFutureDateTime}
            className="px-2"
          >
            <Text style={{ color: isFutureDateTime ? colors.green : colors.textMuted }} className="text-base font-nunito-semibold">
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-4">
          {/* Month/Year Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              className="w-10 h-10 items-center justify-center"
            >
              <Text style={{ color: canGoPrev ? colors.text : colors.textMuted }} className="text-2xl">
                ‹
              </Text>
            </TouchableOpacity>

            <Text style={{ color: colors.text }} className="text-xl font-nunito-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={!canGoNext}
              className="w-10 h-10 items-center justify-center"
            >
              <Text style={{ color: canGoNext ? colors.text : colors.textMuted }} className="text-2xl">
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
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={{ width: '14.28%', height: 44 }} />;
              }

              const selectable = isDateSelectable(day);
              const selected = isDateSelected(day);
              const todayDay = isToday(day);

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleSelectDay(day)}
                  disabled={!selectable}
                  style={{ width: '14.28%', height: 44 }}
                  className="items-center justify-center"
                >
                  <View
                    style={{
                      backgroundColor: selected ? colors.green : 'transparent',
                      borderColor: todayDay && !selected ? colors.green : 'transparent',
                      borderWidth: todayDay && !selected ? 1 : 0,
                    }}
                    className="w-9 h-9 rounded-full items-center justify-center"
                  >
                    <Text
                      style={{
                        color: selected ? '#000000' : selectable ? colors.text : colors.textMuted,
                      }}
                      className={`text-base font-nunito ${selected ? 'font-nunito-bold' : ''}`}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Picker */}
          {tempSelectedDate && (
            <View style={{ borderTopColor: colors.border }} className="mt-6 pt-4 border-t">
              <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-3">
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
                />
                <Text style={{ color: colors.textMuted, fontSize: 24, marginHorizontal: 4 }}>:</Text>
                <TimeWheel
                  values={MINUTES}
                  selectedValue={selectedMinute}
                  onValueChange={setSelectedMinute}
                  padZero={true}
                  textColor={colors.text}
                  textMutedColor={colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)'}
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
          <View style={{ borderTopColor: colors.border }} className="mt-6 py-4 border-t">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mb-1">Selected</Text>
                <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">{selectedDateTimeText}</Text>
              </View>
              {/* Clear Button - inline with selected display */}
              {tempSelectedDate && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={{ backgroundColor: colors.card }}
                  className="ml-4 px-4 py-2 rounded-lg"
                >
                  <Text style={{ color: colors.red }} className="text-sm font-nunito-semibold">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {tempSelectedDate && !isFutureDateTime && (
              <Text style={{ color: colors.red }} className="text-sm font-nunito mt-2">
                Please select a future date and time
              </Text>
            )}
          </View>

          {/* Bottom padding for Android navigation */}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default memo(DatePickerModal);
