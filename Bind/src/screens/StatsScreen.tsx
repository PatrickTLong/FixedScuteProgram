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
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BoxiconsFilled from '../components/BoxiconsFilled';
import { useTheme, textSize, fontFamily, radius, shadow, buttonPadding, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import HeaderIconButton from '../components/HeaderIconButton';
import { useAuth } from '../context/AuthContext';
import { AnimatedStatsIcon, AnimatedStatsIconRef } from '../components/BottomTabBar';

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
const TOP_APPS_COUNT = 5;
const EXPANDED_APPS_COUNT = 25;

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
      <BoxiconsFilled name="bx-refresh-cw" size={size} color={color} />
    </Animated.View>
  );
});

const ExpandIcon = ({ size = iconSize.sm, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-maximize" size={size} color={color} />
);

const AnimatedBar = memo(({ percentage, color, delay, barWidth, maxHeight, label, time, mutedColor, icon, s, animationKey, glintKey }: {
  percentage: number;
  color: string;
  delay: number;
  barWidth: number;
  maxHeight: number;
  label: string;
  time: string;
  mutedColor: string;
  icon?: string;
  s: (size: number) => number;
  animationKey: number;
  glintKey?: number;
}) => {
  const iconSz = barWidth * 0.6;
  const fontSize = barWidth * 0.24;
  // Reserve space for icon + time so bar doesn't overflow
  const headerSpace = (icon ? iconSz + s(6) : 0) + fontSize + s(6);
  const barMaxHeight = maxHeight - headerSpace;

  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glintAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const hasGrown = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    hasGrown.current = false;

    const timeout = setTimeout(() => {
      if (!isMounted.current) return;
      heightAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: (percentage / 100) * barMaxHeight,
          delay,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: false,
        }),
      ]).start(() => { hasGrown.current = true; });
    }, 50);

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
    };
  }, [percentage, delay, barMaxHeight, heightAnim, opacityAnim, animationKey]);

  // Glint triggered by parent on each refresh spin
  useEffect(() => {
    if (glintKey === undefined || glintKey === 0 || !hasGrown.current) return;
    glintAnim.setValue(0);
    Animated.timing(glintAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [glintKey, glintAnim]);

  const glintTranslate = glintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [barMaxHeight, -barMaxHeight * 0.3],
  });

  const glintOpacity = glintAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 0.6, 0.6, 0],
  });

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
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
            {/* Highlight strip for depth */}
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
            {/* Glint sweep */}
            {glintKey !== undefined && (
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: barMaxHeight * 0.25,
                  transform: [{ translateY: glintTranslate }],
                  opacity: glintOpacity,
                }}
              >
                <View style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: barWidth * 0.6,
                  borderBottomWidth: barMaxHeight * 0.06,
                  borderLeftColor: 'transparent',
                  borderBottomColor: 'rgba(255,255,255,0.4)',
                }} />
                <View style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                }} />
                <View style={{
                  width: 0,
                  height: 0,
                  borderRightWidth: barWidth * 0.6,
                  borderTopWidth: barMaxHeight * 0.06,
                  borderRightColor: 'transparent',
                  borderTopColor: 'rgba(255,255,255,0.4)',
                }} />
              </Animated.View>
            )}
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
  const { sharedIsLocked } = useAuth();

  const [activePeriod, setActivePeriod] = useState<StatsPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [totalScreenTime, setTotalScreenTime] = useState(0);
  const [appUsages, setAppUsages] = useState<AppUsage[]>([]);
  const [animationKey, setAnimationKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVisible, setExpandedVisible] = useState(false);
  const [expandedAnimKey, setExpandedAnimKey] = useState(0);
  const [glintKey, setGlintKey] = useState(0);

  // Glint synced to refresh spin interval
  useEffect(() => {
    const interval = setInterval(() => {
      setGlintKey(prev => prev + 1);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Header stats icon animation
  const headerStatsIconRef = useRef<AnimatedStatsIconRef>(null);

  useFocusEffect(
    useCallback(() => {
      // Trigger header icon animation on screen focus
      if (headerStatsIconRef.current) {
        headerStatsIconRef.current.animate();
      }
    }, [])
  );

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

  // Refresh data and replay animation when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadStats();
      }
    });
    return () => subscription.remove();
  }, [activePeriod]);

  // Top 5 apps for bar chart
  const topApps = appUsages.slice(0, TOP_APPS_COUNT);
  const maxAppTime = topApps.length > 0 ? topApps[0].timeInForeground : 0;

  const displayTotal = totalScreenTime;

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Lottie
          source={require('../frontassets/Loading Dots Blue.json')}
          autoPlay
          loop
          speed={2.5}
          style={{ width: s(200), height: s(200) }}
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
          <View style={{ marginLeft: s(8) }}>
            <AnimatedStatsIcon ref={headerStatsIconRef} color={colors.text} filled barColor={colors.bg} />
          </View>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

      <ScrollView
        className="flex-1"
        scrollEnabled={false}
        contentContainerStyle={{ flex: 1, paddingHorizontal: s(16) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
            progressViewOffset={-20}
          />
        }
      >
        {/* Period Tabs */}
        <View className="flex-row mb-4">
          {(['month', 'week', 'today'] as StatsPeriod[]).map((period, index) => (
            <React.Fragment key={period}>
              {index > 0 && <View className="w-2" />}
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => setActivePeriod(period)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: activePeriod === period ? colors.text : colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: s(buttonPadding.smallStandard),
                    ...shadow.card,
                  }}
                  className={`${radius.full} items-center justify-center`}
                >
                  <Text
                    style={{ color: activePeriod === period ? colors.bg : colors.text }}
                    className={`${textSize.small} ${fontFamily.semibold}`}
                  >
                    {period === 'month' ? '30 Days' : period === 'week' ? '7 Days' : 'Today'}
                  </Text>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* SCREEN TIME Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6 p-4`}>
          <View className="flex-row items-center justify-between mb-3">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
              {PERIOD_LABELS[activePeriod]}
            </Text>
            {topApps.length > 0 && (
              <HeaderIconButton
                onPress={() => { setExpandedVisible(true); setExpandedAnimKey(prev => prev + 1); }}
                className=""
                style={{ marginRight: -8 }}
              >
                <ExpandIcon size={s(iconSize.forTabs)} color={colors.text} />
              </HeaderIconButton>
            )}
          </View>

          {/* Total time */}
          <View className="flex-row items-center mb-3">
            <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>
              {formatTime(displayTotal)}
            </Text>
            <SpinningRefresh size={s(iconSize.sm)} color={colors.textMuted} />
          </View>

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
                    mutedColor={colors.textMuted}
                    icon={app.icon}
                    s={s}
                    animationKey={animationKey}
                    glintKey={glintKey}
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
      </ScrollView>

      {/* Expanded Top Apps Modal */}
      <Modal
        visible={expandedVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadow.modal,
              maxHeight: '85%',
            }}
            className={`w-full ${radius['2xl']} overflow-hidden`}
          >
            {/* Minimize button */}
            <View style={{ position: 'absolute', top: s(16), right: s(16), zIndex: 1 }}>
              <HeaderIconButton
                onPress={() => setExpandedVisible(false)}
                className="p-3"
              >
                <BoxiconsFilled name="bx-minimize" size={s(iconSize.headerNav)} color="#FFFFFF" />
              </HeaderIconButton>
            </View>

            {/* Horizontal scrolling bar chart */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ padding: s(16), paddingTop: s(48), alignItems: 'flex-end' }}
            >
              {appUsages.slice(0, EXPANDED_APPS_COUNT).map((app, index) => {
                const maxTime = appUsages[0]?.timeInForeground || 1;
                const percentage = (app.timeInForeground / maxTime) * 100;
                return (
                  <AnimatedBar
                    key={`expanded-${app.packageName}-${expandedAnimKey}`}
                    percentage={percentage}
                    color={APP_COLORS[index % APP_COLORS.length]}
                    delay={index * 80}
                    barWidth={s(32)}
                    maxHeight={s(BAR_CHART_HEIGHT)}
                    label={app.appName}
                    time={formatTime(app.timeInForeground)}
                    mutedColor={colors.textMuted}
                    icon={app.icon}
                    s={s}
                    animationKey={expandedAnimKey}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

export default memo(StatsScreen);
