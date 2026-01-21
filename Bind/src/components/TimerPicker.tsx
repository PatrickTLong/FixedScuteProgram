import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { lightTap } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const BASE_ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 2;

interface WheelProps {
  values: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  label: string;
  textColor: string;
  textMutedColor: string;
  labelColor: string;
  itemHeight: number;
  wheelWidth: number;
}

const Wheel = memo(({ values, selectedValue, onValueChange, label, textColor, textMutedColor, labelColor, itemHeight, wheelWidth }: WheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);
  const lastUserSelectedValue = useRef(selectedValue);
  const isMounted = useRef(false);
  const lastHapticIndex = useRef(-1); // Track last index for haptic feedback

  // Scroll to selected value on mount only, or when value changes externally (not from user scroll)
  useEffect(() => {
    const index = values.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current) {
      // Only auto-scroll if this is initial mount OR if value changed externally (not from user scroll)
      if (!isMounted.current || lastUserSelectedValue.current !== selectedValue) {
        // Skip if user just scrolled to this value
        if (isUserScrolling.current) {
          lastUserSelectedValue.current = selectedValue;
          return;
        }

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: index * itemHeight,
            animated: isMounted.current, // Animate only after mount
          });
        }, 10);
      }
      lastUserSelectedValue.current = selectedValue;
    }
    isMounted.current = true;
  }, [selectedValue, values, itemHeight]);

  // Handle scroll to trigger haptic on each number passed
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    // Trigger haptic when passing a new number
    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;
  }, [values.length, itemHeight]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    // Update the last user selected value before calling onValueChange
    lastUserSelectedValue.current = values[clampedIndex];

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }

    // Snap to nearest item
    scrollRef.current?.scrollTo({
      y: clampedIndex * itemHeight,
      animated: true,
    });

    // Clear user scrolling flag after a short delay
    setTimeout(() => {
      isUserScrolling.current = false;
    }, 100);
  }, [values, selectedValue, onValueChange, itemHeight]);

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
    // Initialize haptic tracking with current position
    const index = values.indexOf(selectedValue);
    lastHapticIndex.current = index >= 0 ? index : 0;
  }, [values, selectedValue]);

  const paddingVertical = (itemHeight * (VISIBLE_ITEMS - 1)) / 2;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          height: itemHeight * VISIBLE_ITEMS,
          width: wheelWidth,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScrollBeginDrag={handleScrollBegin}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            // Handle case where momentum doesn't trigger
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
                  height: itemHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: isSelected ? 32 : 22,
                    fontFamily: isSelected ? 'Nunito-Bold' : 'Nunito-Regular',
                    color: isSelected ? textColor : textMutedColor,
                  }}
                >
                  {String(value).padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: labelColor,
          marginTop: 6,
          fontFamily: 'Nunito-Regular',
        }}
      >
        {label}
      </Text>
    </View>
  );
});

interface TimerPickerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  onDaysChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  onMinutesChange: (value: number) => void;
  onSecondsChange: (value: number) => void;
}

// Pre-generate arrays once
const DAYS = Array.from({ length: 31 }, (_, i) => i);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

function TimerPicker({
  days,
  hours,
  minutes,
  seconds,
  onDaysChange,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
}: TimerPickerProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const itemHeight = s(BASE_ITEM_HEIGHT);
  const wheelWidth = s(56);

  // Create muted color for unselected items (30% opacity of text color)
  const textMutedColor = colors.text === '#ffffff'
    ? 'rgba(255,255,255,0.3)'
    : 'rgba(26,26,26,0.3)';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 4,
      }}
    >
      <Wheel values={DAYS} selectedValue={days} onValueChange={onDaysChange} label="days" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.textMuted} itemHeight={itemHeight} wheelWidth={wheelWidth} />
      <Text style={{ color: colors.textMuted, fontSize: 28, height: itemHeight * VISIBLE_ITEMS, lineHeight: itemHeight * VISIBLE_ITEMS }}>:</Text>
      <Wheel values={HOURS} selectedValue={hours} onValueChange={onHoursChange} label="hrs" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.textMuted} itemHeight={itemHeight} wheelWidth={wheelWidth} />
      <Text style={{ color: colors.textMuted, fontSize: 28, height: itemHeight * VISIBLE_ITEMS, lineHeight: itemHeight * VISIBLE_ITEMS }}>:</Text>
      <Wheel values={MINUTES} selectedValue={minutes} onValueChange={onMinutesChange} label="min" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.textMuted} itemHeight={itemHeight} wheelWidth={wheelWidth} />
      <Text style={{ color: colors.textMuted, fontSize: 28, height: itemHeight * VISIBLE_ITEMS, lineHeight: itemHeight * VISIBLE_ITEMS }}>:</Text>
      <Wheel values={SECONDS} selectedValue={seconds} onValueChange={onSecondsChange} label="sec" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.textMuted} itemHeight={itemHeight} wheelWidth={wheelWidth} />
    </View>
  );
}

export default memo(TimerPicker);
