import React, { useRef, useEffect, useState, useMemo, memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTheme, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const BASE_ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const WINDOW_BUFFER = 8;

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
  selectedFontSize: number;
  unselectedFontSize: number;
  labelFontSize: number;
  labelMarginTop: number;
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const Wheel = memo(({ values, selectedValue, onValueChange, label, textColor, textMutedColor, labelColor, itemHeight, wheelWidth, selectedFontSize, unselectedFontSize, labelFontSize, labelMarginTop, parentScrollRef }: WheelProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const scrolledByUser = useRef(false);

  const selectedIndex = values.indexOf(selectedValue);
  const [windowStart, setWindowStart] = useState(() => Math.max(0, selectedIndex - WINDOW_BUFFER));
  const [windowEnd, setWindowEnd] = useState(() => Math.min(values.length - 1, selectedIndex + WINDOW_BUFFER));

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
    const newStart = Math.max(0, centerIndex - WINDOW_BUFFER);
    const newEnd = Math.min(values.length - 1, centerIndex + WINDOW_BUFFER);
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
      scrolledByUser.current = true;
      onValueChange(values[clampedIndex]);
    }
  }, [values, selectedValue, onValueChange, itemHeight]);

  const paddingVertical = (itemHeight * (VISIBLE_ITEMS - 1)) / 2;

  return (
    <View
      style={{ alignItems: 'center' }}
      onTouchStart={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: false }) : undefined}
      onTouchEnd={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
      onTouchCancel={parentScrollRef ? () => parentScrollRef.current?.setNativeProps({ scrollEnabled: true }) : undefined}
    >
      <View style={{ height: itemHeight * VISIBLE_ITEMS, width: wheelWidth, overflow: 'hidden' }}>
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
                    color: isSelected ? textColor : textMutedColor,
                  }}
                  className={isSelected ? fontFamily.bold : fontFamily.regular}
                >
                  {String(value).padStart(2, '0')}
                </Text>
              </View>
            );
          })}
          {bottomSpacerHeight > 0 && <View style={{ height: bottomSpacerHeight }} />}
        </ScrollView>
      </View>
      <Text
        style={{ fontSize: labelFontSize, color: labelColor, marginTop: labelMarginTop }}
        className={fontFamily.regular}
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
  parentScrollRef?: React.RefObject<ScrollView | null>;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

function TimerPicker({
  days, hours, minutes, seconds,
  onDaysChange, onHoursChange, onMinutesChange, onSecondsChange,
  parentScrollRef,
}: TimerPickerProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const itemHeight = s(BASE_ITEM_HEIGHT);
  const wheelWidth = s(50);
  const textMutedColor = colors.text === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(26,26,26,0.3)';
  const selectedFontSize = s(24);
  const unselectedFontSize = s(18);
  const labelFontSize = s(12);
  const labelMarginTop = s(4);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: s(4) }}>
      <Wheel values={DAYS} selectedValue={days} onValueChange={onDaysChange} label="days" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.text} itemHeight={itemHeight} wheelWidth={wheelWidth} selectedFontSize={selectedFontSize} unselectedFontSize={unselectedFontSize} labelFontSize={labelFontSize} labelMarginTop={labelMarginTop} parentScrollRef={parentScrollRef} />
      <View style={{ height: itemHeight * VISIBLE_ITEMS, justifyContent: 'center', marginHorizontal: s(2), marginTop: -itemHeight * 0.08 }}><Text style={{ color: colors.text, fontSize: s(24) }} className={fontFamily.regular}>:</Text></View>
      <Wheel values={HOURS} selectedValue={hours} onValueChange={onHoursChange} label="hrs" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.text} itemHeight={itemHeight} wheelWidth={wheelWidth} selectedFontSize={selectedFontSize} unselectedFontSize={unselectedFontSize} labelFontSize={labelFontSize} labelMarginTop={labelMarginTop} parentScrollRef={parentScrollRef} />
      <View style={{ height: itemHeight * VISIBLE_ITEMS, justifyContent: 'center', marginHorizontal: s(2), marginTop: -itemHeight * 0.08 }}><Text style={{ color: colors.text, fontSize: s(24) }} className={fontFamily.regular}>:</Text></View>
      <Wheel values={MINUTES} selectedValue={minutes} onValueChange={onMinutesChange} label="min" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.text} itemHeight={itemHeight} wheelWidth={wheelWidth} selectedFontSize={selectedFontSize} unselectedFontSize={unselectedFontSize} labelFontSize={labelFontSize} labelMarginTop={labelMarginTop} parentScrollRef={parentScrollRef} />
      <View style={{ height: itemHeight * VISIBLE_ITEMS, justifyContent: 'center', marginHorizontal: s(2), marginTop: -itemHeight * 0.08 }}><Text style={{ color: colors.text, fontSize: s(24) }} className={fontFamily.regular}>:</Text></View>
      <Wheel values={SECONDS} selectedValue={seconds} onValueChange={onSecondsChange} label="sec" textColor={colors.text} textMutedColor={textMutedColor} labelColor={colors.text} itemHeight={itemHeight} wheelWidth={wheelWidth} selectedFontSize={selectedFontSize} unselectedFontSize={unselectedFontSize} labelFontSize={labelFontSize} labelMarginTop={labelMarginTop} parentScrollRef={parentScrollRef} />
    </View>
  );
}

export default memo(TimerPicker);
