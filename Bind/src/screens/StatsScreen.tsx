import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  Animated,
  NativeModules,
  AppState,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme, textSize, fontFamily, radius, shadow, buttonPadding, iconSize } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

const { UsageStatsModule } = NativeModules;

// Predefined colors for app usage bars
const APP_COLORS = [
  '#22d3ee', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#22c55e', // green
  '#ef4444', // red
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
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
  week: "This Week's Screen Time",
  month: "This Month's Screen Time",
};

const PERIOD_EMPTY: Record<StatsPeriod, string> = {
  today: 'No app usage data available today.',
  week: 'No app usage data available this week.',
  month: 'No app usage data available this month.',
};

const BAR_CHART_HEIGHT = 340;
const TOP_APPS_COUNT = 5;

const AnimatedBar = memo(({ percentage, color, delay, barWidth, maxHeight, label, time, textColor, mutedColor, icon, s, animationKey }: {
  percentage: number;
  color: string;
  delay: number;
  barWidth: number;
  maxHeight: number;
  label: string;
  time: string;
  textColor: string;
  mutedColor: string;
  icon?: string;
  s: (size: number) => number;
  animationKey: number;
}) => {
  const iconSz = barWidth * 0.7;
  // Reserve space for icon + time so bar doesn't overflow
  const headerSpace = (icon ? iconSz + s(4) : 0) + barWidth * 0.26 + s(4);
  const barMaxHeight = maxHeight - headerSpace;

  const heightAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Small delay to ensure layout is complete before animating
    const timeout = setTimeout(() => {
      if (!isMounted.current) return;
      heightAnim.setValue(0);
      Animated.timing(heightAnim, {
        toValue: (percentage / 100) * barMaxHeight,
        duration: 700,
        delay,
        useNativeDriver: false,
      }).start();
    }, 50);

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
    };
  }, [percentage, delay, barMaxHeight, heightAnim, animationKey]);

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ height: maxHeight, justifyContent: 'flex-end' }}>
        <Animated.View style={{ alignItems: 'center' }}>
          {icon ? (
            <Image
              source={{ uri: icon }}
              style={{ width: iconSz, height: iconSz, borderRadius: iconSz * 0.2, marginBottom: s(4) }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={{ color: textColor, fontSize: barWidth * 0.26, marginBottom: s(4) }} className={fontFamily.semibold}>
            {time}
          </Text>
          <Animated.View
            style={{
              width: barWidth,
              height: heightAnim,
              backgroundColor: color,
              borderRadius: barWidth * 0.2,
            }}
          />
        </Animated.View>
      </View>
      <View style={{ height: barWidth * 0.22 * 4, marginTop: s(8), justifyContent: 'flex-start' }}>
        <Text
          style={{ color: mutedColor, fontSize: barWidth * 0.22, textAlign: 'center', width: barWidth * 1.6 }}
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
  const { sharedIsLocked } = useAuth();

  const [activePeriod, setActivePeriod] = useState<StatsPeriod>('today');
  const [loading, setLoading] = useState(true);
  const [totalScreenTime, setTotalScreenTime] = useState(0);
  const [appUsages, setAppUsages] = useState<AppUsage[]>([]);
  const [animationKey, setAnimationKey] = useState(0);

  const loadStats = useCallback(async () => {
    if (Platform.OS !== 'android' || !UsageStatsModule) {
      setLoading(false);
      return;
    }

    try {
      const [screenTime, apps] = await Promise.all([
        UsageStatsModule.getScreenTime(activePeriod),
        UsageStatsModule.getAllAppsUsage(activePeriod),
      ]);

      setTotalScreenTime(screenTime);
      setAppUsages(apps || []);
      setAnimationKey(prev => prev + 1);
    } catch {
      // Usage stats unavailable
    } finally {
      setLoading(false);
    }
  }, [activePeriod]);

  // Load on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadStats();
      }
    });
    return () => subscription.remove();
  }, [loadStats]);

  // Top 5 apps for bar chart
  const topApps = appUsages.slice(0, TOP_APPS_COUNT);
  const maxAppTime = topApps.length > 0 ? topApps[0].timeInForeground : 0;

  const displayTotal = totalScreenTime;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Lottie
          source={require('../frontassets/Loading Dots Blue.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: s(250), height: s(250) }}
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
          <Svg width={s(iconSize.lg)} height={s(iconSize.lg)} viewBox="0 0 24 24" fill={colors.text} style={{ marginLeft: s(8) }}>
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9Z"
            />
          </Svg>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

      <View
        className="flex-1"
        style={{ paddingHorizontal: s(16) }}
      >
        {/* Period Tabs */}
        <View className="flex-row mb-4">
          {(['today', 'week', 'month'] as StatsPeriod[]).map((period, index) => (
            <React.Fragment key={period}>
              {index > 0 && <View className="w-2" />}
              <TouchableOpacity
                onPressIn={lightTap}
                onPress={() => setActivePeriod(period)}
                style={{
                  backgroundColor: activePeriod === period ? colors.text : colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: s(buttonPadding.smallStandard),
                  ...shadow.card,
                }}
                className={`flex-1 ${radius.full} items-center justify-center`}
              >
                <Text
                  style={{ color: activePeriod === period ? colors.bg : colors.text }}
                  className={`${textSize.small} ${fontFamily.semibold}`}
                >
                  {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* SCREEN TIME Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6 p-4`}>
          <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-3`}>
            {PERIOD_LABELS[activePeriod]}
          </Text>

          {/* Total time */}
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} mb-3`}>
            {formatTime(displayTotal)}
          </Text>

          <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: s(12), marginHorizontal: -s(16) }} />

          {/* Vertical bar chart */}
          {topApps.length > 0 && maxAppTime > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: s(8) }}>
              {topApps.map((app, index) => {
                const percentage = (app.timeInForeground / maxAppTime) * 100;
                return (
                  <AnimatedBar
                    key={`${app.packageName}-${animationKey}`}
                    percentage={percentage}
                    color={APP_COLORS[index % APP_COLORS.length]}
                    delay={index * 120}
                    barWidth={s(44)}
                    maxHeight={s(BAR_CHART_HEIGHT)}
                    label={app.appName}
                    time={formatTime(app.timeInForeground)}
                    textColor={colors.text}
                    mutedColor={colors.textMuted}
                    icon={app.icon}
                    s={s}
                    animationKey={animationKey}
                  />
                );
              })}
            </View>
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
      </View>
    </View>
  );
}

export default memo(StatsScreen);
