import React, { useRef, useEffect, memo, useCallback, useState, useMemo } from 'react';
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
const VISIBLE_ITEMS = 3; // Show full items above and below selected
const WINDOW_BUFFER = 2; // Render this many items above and below the selected

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
  const lastHapticIndex = useRef(-1);
  // Window tracking: use ref to avoid re-renders, only setState when window edge is hit
  const windowCenterRef = useRef(values.indexOf(selectedValue));
  const [windowRange, setWindowRange] = useState(() => {
    const idx = values.indexOf(selectedValue);
    return { start: Math.max(0, idx - WINDOW_BUFFER), end: Math.min(values.length - 1, idx + WINDOW_BUFFER) };
  });

  const windowedValues = useMemo(
    () => values.slice(windowRange.start, windowRange.end + 1),
    [values, windowRange.start, windowRange.end],
  );

  const topSpacerHeight = windowRange.start * itemHeight;
  const bottomSpacerHeight = (values.length - 1 - windowRange.end) * itemHeight;

  // Only update window state when index is at or beyond the current window edge
  const updateWindowIfNeeded = useCallback((index: number) => {
    windowCenterRef.current = index;
    setWindowRange(prev => {
      // Check if index is at or past the edge of the current window
      if (index <= prev.start || index >= prev.end || index < prev.start || index > prev.end) {
        const newStart = Math.max(0, index - WINDOW_BUFFER);
        const newEnd = Math.min(values.length - 1, index + WINDOW_BUFFER);
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
      if (!isMounted.current || lastUserSelectedValue.current !== selectedValue) {
        if (isUserScrolling.current) {
          lastUserSelectedValue.current = selectedValue;
          return;
        }

        updateWindowIfNeeded(index);

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: index * itemHeight,
            animated: isMounted.current,
          });
        }, 10);
      }
      lastUserSelectedValue.current = selectedValue;
    }
    isMounted.current = true;
  }, [selectedValue, values, itemHeight, updateWindowIfNeeded]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const currentIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(currentIndex, values.length - 1));

    if (lastHapticIndex.current !== clampedIndex && lastHapticIndex.current !== -1) {
      lightTap();
    }
    lastHapticIndex.current = clampedIndex;

    // Only re-render when we reach the edge of the current window
    updateWindowIfNeeded(clampedIndex);
  }, [values.length, itemHeight, updateWindowIfNeeded]);

  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));

    lastUserSelectedValue.current = values[clampedIndex];
    updateWindowIfNeeded(clampedIndex);

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }

    scrollRef.current?.scrollTo({
      y: clampedIndex * itemHeight,
      animated: true,
    });

    setTimeout(() => {
      isUserScrolling.current = false;
    }, 100);
  }, [values, selectedValue, onValueChange, itemHeight, updateWindowIfNeeded]);

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
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
            if (e.nativeEvent.velocity?.y === 0) {
              handleScrollEnd(e);
            }
          }}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Top spacer replaces items above the window */}
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
          {/* Bottom spacer replaces items below the window */}
          {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
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
