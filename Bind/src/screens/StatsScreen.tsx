import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Text,
  View,
  ScrollView,
  NativeModules,
  AppState,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme, textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
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
}

// Format milliseconds to human-readable time
function formatTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} m`;
  } else if (hours > 0) {
    return `${hours} h`;
  } else {
    return `${minutes} m`;
  }
}

function StatsScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const { sharedIsLocked } = useAuth();

  const [loading, setLoading] = useState(true);
  const [totalScreenTime, setTotalScreenTime] = useState(0);
  const [appUsages, setAppUsages] = useState<AppUsage[]>([]);

  const loadStats = useCallback(async () => {
    if (Platform.OS !== 'android' || !UsageStatsModule) {
      setLoading(false);
      return;
    }

    try {
      const [screenTime, apps] = await Promise.all([
        UsageStatsModule.getTodayScreenTime(),
        UsageStatsModule.getAllAppsUsageToday(),
      ]);

      setTotalScreenTime(screenTime);
      setAppUsages(apps || []);
    } catch {
      // Usage stats unavailable
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Calculate total from all apps for the bar proportions
  const totalFromApps = appUsages.reduce((sum, app) => sum + app.timeInForeground, 0);
  // Use whichever is larger (totalScreenTime from system vs sum of top apps)
  const displayTotal = Math.max(totalScreenTime, totalFromApps);

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: s(16), paddingTop: s(16), paddingBottom: s(32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} mb-4`}>
          Stats
        </Text>

        {/* TODAY'S SCREEN TIME Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6 p-4`}>
          <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-3`}>
            TODAY'S SCREEN TIME
          </Text>

          {/* Total time */}
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} mb-3`}>
            {formatTime(displayTotal)}
          </Text>

          {/* Stacked bar */}
          {appUsages.length > 0 && displayTotal > 0 && (
            <View
              style={{ height: s(12), borderRadius: s(6), overflow: 'hidden', backgroundColor: colors.border }}
              className="flex-row mb-4"
            >
              {appUsages.map((app, index) => {
                const percentage = (app.timeInForeground / displayTotal) * 100;
                if (percentage < 1) return null;
                return (
                  <View
                    key={app.packageName}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: APP_COLORS[index % APP_COLORS.length],
                    }}
                  />
                );
              })}
            </View>
          )}

          {/* App list */}
          {appUsages.map((app, index) => (
            <View
              key={app.packageName}
              style={index < appUsages.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.divider } : undefined}
              className="flex-row items-center py-3"
            >
              {/* Color dot */}
              <View
                style={{
                  width: s(10),
                  height: s(10),
                  borderRadius: s(5),
                  backgroundColor: APP_COLORS[index % APP_COLORS.length],
                  marginRight: s(12),
                }}
              />
              {/* App name */}
              <Text style={{ color: colors.text }} className={`flex-1 ${textSize.small} ${fontFamily.semibold}`}>
                {app.appName}
              </Text>
              {/* Time */}
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold}`}>
                {formatTime(app.timeInForeground)}
              </Text>
            </View>
          ))}

          {appUsages.length === 0 && (
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} text-center py-4`}>
              No app usage data available today.
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
