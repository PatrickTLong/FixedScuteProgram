import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  Animated,
  Easing,
  NativeModules,
  AppState,
  Platform,
  Image,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

const { UsageStatsModule } = NativeModules;

// Predefined colors for app usage bars
const APP_COLORS = [
  '#22d3ee', // cyan
  '#60a5fa', // blue (lighter)
  '#a78bfa', // purple (lighter)
  '#f472b6', // pink (lighter)
  '#fbbf24', // amber (lighter)
  '#34d399', // green (lighter)
  '#f87171', // red (lighter)
  '#fb923c', // orange (lighter)
  '#2dd4bf', // teal (lighter)
  '#818cf8', // indigo (lighter)
];

interface AppUsage {
  packageName: string;
  appName: string;
  timeInForeground: number; // milliseconds
  icon?: string;
}

type StatsPeriod = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Today's Screen Time",
  week: 'Last 7 Days Screen Time',
  month: 'Last 30 Days Screen Time',
};

const PERIOD_EMPTY: Record<StatsPeriod, string> = {
  today: 'No app usage data available today.',
  week: 'No app usage data available for the last 7 days.',
  month: 'No app usage data available for the last 30 days.',
};

const BAR_CHART_HEIGHT = 340;
const MIN_USAGE_MS = 60000; // 1 minute — hide apps at or below this

const SpinningRefresh = memo(({ size, color }: { size: number; color: string }) => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const runSpin = () => {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    runSpin();
    const interval = setInterval(runSpin, 800);
    return () => clearInterval(interval);
  }, [spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  return (
    <Animated.View style={{ transform: [{ rotate }], marginLeft: size * 0.4 }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M18.13 17.13c-.15.18-.31.36-.48.52-.73.74-1.59 1.31-2.54 1.71-1.97.83-4.26.83-6.23 0-.95-.4-1.81-.98-2.54-1.72a7.8 7.8 0 0 1-1.71-2.54c-.42-.99-.63-2.03-.63-3.11H2c0 1.35.26 2.66.79 3.89.5 1.19 1.23 2.26 2.14 3.18s1.99 1.64 3.18 2.14c1.23.52 2.54.79 3.89.79s2.66-.26 3.89-.79c1.19-.5 2.26-1.23 3.18-2.14.17-.17.32-.35.48-.52L22 20.99v-6h-6l2.13 2.13Zm.94-12.2a9.9 9.9 0 0 0-3.18-2.14 10.12 10.12 0 0 0-7.79 0c-1.19.5-2.26 1.23-3.18 2.14-.17.17-.32.35-.48.52L1.99 3v6h6L5.86 6.87c.15-.18.31-.36.48-.52.73-.74 1.59-1.31 2.54-1.71 1.97-.83 4.26-.83 6.23 0 .95.4 1.81.98 2.54 1.72.74.73 1.31 1.59 1.71 2.54.42.99.63 2.03.63 3.11h2c0-1.35-.26-2.66-.79-3.89-.5-1.19-1.23-2.26-2.14-3.18Z" />
      </Svg>
    </Animated.View>
  );
});

const AnimatedBar = memo(({ percentage, color, barWidth, maxHeight, label, time, mutedColor, icon, s }: {
  percentage: number;
  color: string;
  barWidth: number;
  maxHeight: number;
  label: string;
  time: string;
  mutedColor: string;
  icon?: string;
  s: (size: number) => number;
}) => {
  const iconSz = barWidth * 0.6;
  const fontSize = barWidth * 0.24;
  const headerSpace = (icon ? iconSz + s(6) : 0) + fontSize + s(6);
  const barMaxHeight = maxHeight - headerSpace;

  const targetHeight = (percentage / 100) * barMaxHeight;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    heightAnim.setValue(targetHeight);
    opacityAnim.setValue(1);
  }, [percentage, targetHeight, heightAnim, opacityAnim]);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ height: maxHeight, justifyContent: 'flex-end' }}>
        <Animated.View style={{ alignItems: 'center', opacity: opacityAnim }}>
          {icon ? (
            <Image
              source={{ uri: icon }}
              style={{ width: iconSz, height: iconSz, borderRadius: iconSz * 0.22, marginBottom: s(6) }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={{ color: mutedColor, fontSize, marginBottom: s(6), letterSpacing: 0.2 }} className={fontFamily.semibold}>
            {time}
          </Text>
          <Animated.View
            style={{
              width: barWidth * 0.6,
              height: heightAnim,
              borderRadius: barWidth * 0.12,
              backgroundColor: color,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderTopLeftRadius: barWidth * 0.12,
                borderBottomLeftRadius: barWidth * 0.12,
              }}
            />
          </Animated.View>
        </Animated.View>
      </View>
      <View style={{ height: fontSize * 4, marginTop: s(8), justifyContent: 'flex-start' }}>
        <Text
          style={{ color: mutedColor, fontSize: fontSize * 0.9, textAlign: 'center', width: barWidth * 1.5, letterSpacing: 0.1 }}
          className={fontFamily.regular}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </View>
  );
});

// Format milliseconds to human-readable time
function formatTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

function StatsScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const { sharedStats, setSharedStats } = useAuth();

  const [activePeriod, setActivePeriod] = useState<StatsPeriod>('month');
  const hasCache = sharedStats.month !== null;
  const [loading, setLoading] = useState(!hasCache);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<AppUsage>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Local per-period cache so switching tabs is instant (no remount)
  type PeriodData = { screenTime: number; appUsages: AppUsage[] };
  const [periodCache, setPeriodCache] = useState<Record<StatsPeriod, PeriodData | null>>({
    today: sharedStats.today ?? null,
    week: sharedStats.week ?? null,
    month: sharedStats.month ?? null,
  });

  // Reset scroll position when period changes
  useEffect(() => {
    scrollX.setValue(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activePeriod, scrollX]);

  const sharedStatsRef = useRef(sharedStats);
  sharedStatsRef.current = sharedStats;
  const periodCacheRef = useRef(periodCache);
  periodCacheRef.current = periodCache;

  const loadPeriod = useCallback(async (period: StatsPeriod, skipCache = false) => {
    if (Platform.OS !== 'android' || !UsageStatsModule) return;

    // Use local or shared cache if available
    if (!skipCache) {
      const cached = periodCacheRef.current[period] ?? sharedStatsRef.current[period];
      if (cached) {
        setPeriodCache(prev => ({ ...prev, [period]: cached }));
        return;
      }
    }

    try {
      const [screenTime, apps] = await Promise.all([
        UsageStatsModule.getScreenTime(period),
        UsageStatsModule.getAllAppsUsage(period),
      ]);
      const data = { screenTime, appUsages: apps || [] };
      setPeriodCache(prev => ({ ...prev, [period]: data }));
      setSharedStats(prev => ({ ...prev, [period]: data }));
    } catch {
      // Usage stats unavailable
    }
  }, [setSharedStats]);

  // Load all periods on mount so switching is instant
  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        loadPeriod('month'),
        loadPeriod('week'),
        loadPeriod('today'),
      ]);
      setLoading(false);
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh current period when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadPeriod(activePeriod, true);
      }
    });
    return () => subscription.remove();
  }, [activePeriod, loadPeriod]);

  // Current period's data from cache
  const currentData = periodCache[activePeriod];
  const displayTotal = currentData?.screenTime ?? 0;
  const filteredApps = (currentData?.appUsages ?? []).filter(app => app.timeInForeground > MIN_USAGE_MS);
  const maxAppTime = filteredApps.length > 0 ? filteredApps[0].timeInForeground : 0;

  const barWidth = s(44);
  const barItemWidth = barWidth * 1.5 + s(8);
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: barItemWidth,
    offset: barItemWidth * index,
    index,
  }), [barItemWidth]);

  const renderBar = useCallback(({ item, index }: { item: AppUsage; index: number }) => {
    const percentage = (item.timeInForeground / maxAppTime) * 100;
    return (
      <View style={{ width: barItemWidth }}>
        <AnimatedBar
          percentage={percentage}
          color={APP_COLORS[index % APP_COLORS.length]}
          barWidth={barWidth}
          maxHeight={s(BAR_CHART_HEIGHT)}
          label={item.appName}
          time={formatTime(item.timeInForeground)}
          mutedColor={colors.textMuted}
          icon={item.icon}
          s={s}
        />
      </View>
    );
  }, [maxAppTime, barItemWidth, barWidth, s, colors.textMuted]);

  const barKeyExtractor = useCallback((item: AppUsage) => item.packageName, []);

  // Pull-to-refresh — force reload current period
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPeriod(activePeriod, true);
    setRefreshing(false);
  }, [activePeriod, loadPeriod]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <LottieView
          source={require('../frontassets/blue loading.json')}
          autoPlay
          loop
          resizeMode="contain"
          style={{ width: s(120), height: s(120) }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Stats</Text>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: s(16) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.text]} progressBackgroundColor={colors.card} />}
        >
        {/* Period Tabs */}
        <View className="flex-row mb-4">
          {(['month', 'week', 'today'] as StatsPeriod[]).map((period, index) => (
            <React.Fragment key={period}>
              {index > 0 && <View className="w-2" />}
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={() => setActivePeriod(period)}
                  android_ripple={{ color: activePeriod === period ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  style={{
                    backgroundColor: activePeriod === period ? colors.text : colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9999,
                    overflow: 'hidden',
                    ...shadow.card,
                  }}
                  className={`${pill} items-center justify-center`}
                >
                  <Text
                    style={{ color: activePeriod === period ? colors.bg : colors.text }}
                    className={`${textSize.small} ${fontFamily.semibold}`}
                  >
                    {period === 'month' ? '30 Days' : period === 'week' ? '7 Days' : 'Today'}
                  </Text>
                </Pressable>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* SCREEN TIME Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6 p-4`}>
          <View className="mb-3">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
              {PERIOD_LABELS[activePeriod]}
            </Text>
          </View>

          {/* Total time */}
          <View className="flex-row items-center mb-3">
            <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>
              {formatTime(displayTotal)}
            </Text>
            <SpinningRefresh size={s(iconSize.sm)} color={colors.textMuted} />
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: s(12), marginHorizontal: -s(16) }} />

          {/* Horizontal scrolling bar chart */}
          {filteredApps.length > 0 && maxAppTime > 0 ? (
            <>
              <FlatList
                ref={flatListRef}
                data={filteredApps}
                keyExtractor={barKeyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                getItemLayout={getItemLayout}
                windowSize={5}
                maxToRenderPerBatch={10}
                initialNumToRender={6}
                renderItem={renderBar}
                contentContainerStyle={{ alignItems: 'flex-end', paddingTop: s(8) }}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
              />
            </>
          ) : (
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center py-4`}>
              {PERIOD_EMPTY[activePeriod]}
            </Text>
          )}
        </View>

        {Platform.OS !== 'android' && (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} p-4`}>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center`}>
              App usage stats are currently available on Android only.
            </Text>
          </View>
        )}
        </ScrollView>

    </View>
  );
}

export default memo(StatsScreen);
