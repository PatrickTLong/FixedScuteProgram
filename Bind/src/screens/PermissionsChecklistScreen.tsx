import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  NativeModules,
  AppState,
  Animated,
  Easing,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellRingingIcon, WheelchairIcon, ChartBarIcon, MonitorIcon, BatteryChargingIcon, ShieldCheckIcon, TimerIcon, BellIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme, textSize, fontFamily, radius, pill } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

const { PermissionsModule } = NativeModules;

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  svgPath?: string;
  isGranted: boolean;
  androidIntent?: string;
  iosAction?: 'screenTime' | 'notifications' | 'openSettings';
  descriptionStyle?: string;
}

const SVG_PATHS: Record<string, { d: string[]; viewBox: string }> = {
  notification: { d: ['M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v440L640-120H200Zm334-460 106-30q5-28-13.5-49T580-680q-25 0-42.5 17.5T520-620q0 11 4 21t10 19Zm-240 70 106-30q4-28-14-49t-46-21q-25 0-42.5 17.5T280-550q0 11 4 21t10 19Zm166 150q69 0 120-45t60-113l-320 90q26 32 62 50t78 18Zm140 160 160-160h-80q-33 0-56.5 23.5T600-280v80Z'], viewBox: '0 -960 960 960' },
  accessibility: { d: ['M100,36a28,28,0,1,1,28,28A28,28,0,0,1,100,36ZM227.6,92.57A15.7,15.7,0,0,0,212,80H44a16,16,0,0,0-6.7,30.53l.06,0,53.89,23.73-21.92,83.3a16,16,0,0,0,7.9,20.91A15.83,15.83,0,0,0,84,240a16,16,0,0,0,14.44-9.06L128,180l29.58,51a16,16,0,0,0,29.07-13.35l-21.92-83.3,54-23.76A15.7,15.7,0,0,0,227.6,92.57Z'], viewBox: '0 0 256 256' },
  displayOverlay: { d: [
    'M22.5 0h-21A1.5 1.5 0 0 0 0 1.5V18a1.5 1.5 0 0 0 1.5 1.5h9.25a0.25 0.25 0 0 1 0.25 0.25v2a0.25 0.25 0 0 1 -0.25 0.25H7.5a1 1 0 0 0 0 2h9a1 1 0 0 0 0 -2h-3.25a0.25 0.25 0 0 1 -0.25 -0.25v-2a0.25 0.25 0 0 1 0.25 -0.25h9.25A1.5 1.5 0 0 0 24 18V1.5A1.5 1.5 0 0 0 22.5 0ZM22 15a0.5 0.5 0 0 1 -0.5 0.5h-19A0.5 0.5 0 0 1 2 15V2.5a0.5 0.5 0 0 1 0.5 -0.5h19a0.5 0.5 0 0 1 0.5 0.5Z',
    'M4.76 4.41h3.29s0.55 0 0.55 0.55v7.67s0 0.55 -0.55 0.55H4.76s-0.55 0 -0.55 -0.55V4.96s0 -0.55 0.55 -0.55',
    'M11.41 6.05h8.05a0.75 0.75 0 0 0 0 -1.5h-8a0.75 0.75 0 0 0 0 1.5Z',
    'M19.46 8.07h-8a0.75 0.75 0 0 0 0 1.5h8.05a0.75 0.75 0 0 0 0 -1.5Z',
    'M17 11.55h-5.59a0.75 0.75 0 0 0 0 1.5H17a0.75 0.75 0 0 0 0 -1.5Z',
  ], viewBox: '0 0 24 24' },
  batteryOptimization: { d: [
    'M24 11.75a2 2 0 0 0 -2 -2h-1v-1a2 2 0 0 0 -2 -2h-0.79A0.25 0.25 0 0 0 18 7a12.93 12.93 0 0 1 -0.33 1.47 0.28 0.28 0 0 0 0 0.22 0.26 0.26 0 0 0 0.2 0.1h0.63a0.5 0.5 0 0 1 0.5 0.5v1.5a1 1 0 0 0 1 1h1.75A0.25 0.25 0 0 1 22 12v2.5a0.25 0.25 0 0 1 -0.25 0.25H20a1 1 0 0 0 -1 1v1.5a0.5 0.5 0 0 1 -0.5 0.5h-16a0.5 0.5 0 0 1 -0.5 -0.5v-8a0.5 0.5 0 0 1 0.5 -0.5h2.27A0.25 0.25 0 0 0 5 8.66a0.24 0.24 0 0 0 0 -0.2 2.75 2.75 0 0 1 0 -0.57 3.51 3.51 0 0 1 0.11 -0.83 0.27 0.27 0 0 0 0 -0.21 0.26 0.26 0 0 0 -0.2 -0.1H2a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h17a2 2 0 0 0 2 -2v-1h1a2 2 0 0 0 2 -2Z',
    'M7.76 10.13c-0.35 0.38 -0.69 0.75 -1 1.11 -1.23 1.47 -2.07 2.7 -2.15 2.82a0.75 0.75 0 0 0 0.2 1 0.79 0.79 0 0 0 1 -0.2c0.51 -0.76 3.14 -4.6 6.21 -6.3a0.5 0.5 0 0 1 0.68 0.19 0.51 0.51 0 0 1 -0.2 0.68 15.06 15.06 0 0 0 -3.6 3.11 2.09 2.09 0 0 0 1.93 1.28 4.12 4.12 0 0 0 2.1 -0.72c2 -1.22 4.08 -5.53 3.58 -8.43a0.52 0.52 0 0 0 -0.25 -0.36 0.5 0.5 0 0 0 -0.43 0 8.92 8.92 0 0 1 -3.71 0.45 6.73 6.73 0 0 0 -3.9 0.69A3.06 3.06 0 0 0 6.47 7.9a3 3 0 0 0 1.29 2.23Z',
  ], viewBox: '0 0 24 24' },
  deviceAdmin: { d: [
    'M13.27 19.14a0.24 0.24 0 0 0 0 -0.28 2.9 2.9 0 0 1 2.61 -4.55 0.23 0.23 0 0 0 0.25 -0.14 2.89 2.89 0 0 1 1.24 -1.32 0.25 0.25 0 0 0 0.13 -0.22V10.5a0.76 0.76 0 0 0 -0.75 -0.75h-12a0.75 0.75 0 0 0 -0.75 0.75v10a1.22 1.22 0 0 0 1.21 1.23h7.37a0.25 0.25 0 0 0 0.2 -0.09 0.23 0.23 0 0 0 0.05 -0.21 2.91 2.91 0 0 1 0.44 -2.29Z',
    'M4 7.17a1 1 0 0 0 0.13 0.91 1 1 0 0 0 0.81 0.42h11.64a1 1 0 0 0 0.82 -0.42 1 1 0 0 0 0.13 -0.91 6.93 6.93 0 0 0 -3.39 -3.87A0.24 0.24 0 0 1 14 3l0.64 -1.63a1 1 0 0 0 -1.85 -0.73l-0.7 1.79a0.24 0.24 0 0 1 -0.26 0.15 7.26 7.26 0 0 0 -2.15 0 0.25 0.25 0 0 1 -0.27 -0.15L8.72 0.64a1 1 0 0 0 -1.87 0.72L7.48 3a0.25 0.25 0 0 1 -0.12 0.31A6.85 6.85 0 0 0 4 7.17ZM13 5a0.75 0.75 0 0 1 0 1.5 0.75 0.75 0 0 1 0 -1.5ZM8.5 5a0.75 0.75 0 0 1 0 1.5 0.75 0.75 0 0 1 0 -1.5Z',
    'M20.75 11a1 1 0 0 0 -2 0v1.26a0.25 0.25 0 0 0 0.23 0.25 2.86 2.86 0 0 1 1.38 0.48 0.24 0.24 0 0 0 0.26 0 0.24 0.24 0 0 0 0.13 -0.22Z',
    'M1.75 10a1 1 0 0 0 -1 1v7a1 1 0 0 0 2 0v-7a1 1 0 0 0 -1 -1Z',
    'M22.87 18.15a1.39 1.39 0 0 0 -1.33 -2.31l-1 0.23a0.16 0.16 0 0 1 -0.19 -0.11l-0.29 -1a1.38 1.38 0 0 0 -1.33 -1 1.36 1.36 0 0 0 -1.33 1l-0.29 1a0.16 0.16 0 0 1 -0.19 0.11l-1 -0.23a1.36 1.36 0 0 0 -1.51 0.66 1.39 1.39 0 0 0 0.18 1.65l0.69 0.74a0.17 0.17 0 0 1 0 0.23l-0.69 0.74a1.39 1.39 0 0 0 1.41 2.3l1 -0.23a0.18 0.18 0 0 1 0.19 0.12l0.29 1a1.37 1.37 0 0 0 1.33 1 1.38 1.38 0 0 0 1.33 -1l0.29 -1a0.17 0.17 0 0 1 0.19 -0.12l1 0.23a1.38 1.38 0 0 0 1.52 -0.66 1.36 1.36 0 0 0 -0.19 -1.64l-0.68 -0.74a0.17 0.17 0 0 1 0 -0.23Zm-4.12 2.35a1.5 1.5 0 1 1 1.5 -1.5 1.5 1.5 0 0 1 -1.5 1.5Z',
  ], viewBox: '0 0 24 24' },
};

// Android permissions (7 total)
const ANDROID_PERMISSIONS: Permission[] = [
  {
    id: 'notification',
    title: 'Notification Access',
    description: 'Block notifications from restricted apps and send you updates about blocking sessions.',
    icon: BellRingingIcon,
    isGranted: false,
    androidIntent: 'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Service',
    description: 'Monitor and block distracting apps.',
    icon: WheelchairIcon,
    isGranted: false,
    androidIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
  },
  {
    id: 'usageAccess',
    title: 'Usage Access',
    description: 'Monitor app usage and enforce blocking rules.',
    icon: ChartBarIcon,
    isGranted: false,
    androidIntent: 'android.settings.USAGE_ACCESS_SETTINGS',
  },
  {
    id: 'displayOverlay',
    title: 'Display Overlay',
    description: 'Display blocking screens over restricted apps.',
    icon: MonitorIcon,
    isGranted: false,
    androidIntent: 'android.settings.action.MANAGE_OVERLAY_PERMISSION',
  },
  {
    id: 'batteryOptimization',
    title: 'Unrestricted Battery',
    description: 'Ensure scheduled presets work reliably even when the app is closed.',
    icon: BatteryChargingIcon,
    isGranted: false,
    androidIntent: 'battery_optimization_request',
  },
  {
    id: 'deviceAdmin',
    title: 'Device Admin',
    description: 'Prevent Scute from being uninstalled during active blocking sessions.',
    icon: ShieldCheckIcon,
    isGranted: false,
    androidIntent: 'device_admin_request',
  },
];

// iOS permissions (2 total - much simpler!)
const IOS_PERMISSIONS: Permission[] = [
  {
    id: 'screenTime',
    title: 'Screen Time Access',
    description: 'Block apps and websites during focus sessions.',
    icon: TimerIcon,
    isGranted: false,
    iosAction: 'screenTime',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Receive alerts when blocking sessions start and end.',
    icon: BellIcon,
    isGranted: false,
    iosAction: 'notifications',
  },
];

// Get the default permissions based on platform
const DEFAULT_PERMISSIONS = Platform.OS === 'ios' ? IOS_PERMISSIONS : ANDROID_PERMISSIONS;


function PermissionsChecklistScreen() {
  const { handlePermissionsComplete: onComplete } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const transitionRef = useRef<ScreenTransitionRef>(null);

  // Derived data
  const ungrantedPermissions = useMemo(() => permissions.filter(p => !p.isGranted), [permissions]);
  const allGranted = ungrantedPermissions.length === 0;
  const totalCount = permissions.length;

  // Animation refs
  const iconSlide = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitSlideY = useRef(new Animated.Value(0)).current;

  // Track previous ungranted list to detect transitions
  const prevUngrantedRef = useRef<string[]>([]);
  const hasPlayedEntrance = useRef(false);

  const [displayedPermission, setDisplayedPermission] = useState<Permission | null>(null);

  // Entrance animation (matches LandingScreen)
  const playEntrance = useCallback(() => {
    iconSlide.setValue(1);
    textOpacity.setValue(0);
    exitOpacity.setValue(1);
    exitSlideY.setValue(0);

    Animated.spring(iconSlide, {
      toValue: 0,
      speed: 14,
      bounciness: 16,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [iconSlide, textOpacity, exitOpacity, exitSlideY]);

  // Button pulse animation (matches MembershipContent)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1.03,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolations
  const iconTranslateY = iconSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });
  const iconOpacity = iconSlide.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // Check all permissions from native module
  const checkPermissions = useCallback(async () => {
    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredIds = DEFAULT_PERMISSIONS.map(p => p.id);
        const nowAllGranted = requiredIds.every(id => states[id]);

        setPermissions(prev =>
          prev.map(p => ({
            ...p,
            isGranted: states[p.id] ?? false,
          }))
        );

        if (nowAllGranted) {
          await transitionRef.current?.animateOut('left');
          onComplete();
          return;
        }
      }
    } catch (error) {
      // Silent failure - permissions will show as not granted
    } finally {
      setIsLoading(false);
    }
  }, [onComplete]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Re-check permissions when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  // Auto-complete if permissions were already all granted before mount
  useEffect(() => {
    if (!isLoading && allGranted) {
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGranted, isLoading, onComplete]);

  // Play entrance when loading finishes
  useEffect(() => {
    if (!isLoading && ungrantedPermissions.length > 0 && !hasPlayedEntrance.current) {
      hasPlayedEntrance.current = true;
      prevUngrantedRef.current = ungrantedPermissions.map(p => p.id);
      setDisplayedPermission(ungrantedPermissions[0]);
      playEntrance();
    }
  }, [isLoading, ungrantedPermissions, playEntrance]);

  // Detect permission grant and transition to next
  useEffect(() => {
    if (isLoading || !hasPlayedEntrance.current) return;

    const currentIds = ungrantedPermissions.map(p => p.id);
    const prevIds = prevUngrantedRef.current;

    // If the list shrank, a permission was granted — exit old, then show & enter new
    if (prevIds.length > 0 && currentIds.length < prevIds.length && currentIds.length > 0) {
      prevUngrantedRef.current = currentIds;
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(exitSlideY, {
          toValue: -60,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDisplayedPermission(ungrantedPermissions[0]);
        playEntrance();
      });
    } else {
      prevUngrantedRef.current = currentIds;
    }
  }, [ungrantedPermissions, isLoading, exitOpacity, exitSlideY, playEntrance]);

  async function openPermissionSettings(permission: Permission) {
    // iOS permission handling
    if (Platform.OS === 'ios') {
      if (permission.iosAction === 'screenTime') {
        // Request Screen Time authorization directly
        try {
          if (PermissionsModule?.requestScreenTimeAuthorization) {
            await PermissionsModule.requestScreenTimeAuthorization();
            checkPermissions();
          }
        } catch (error) {
          // If direct request fails, open settings
          if (PermissionsModule?.openAppSettings) {
            PermissionsModule.openAppSettings();
          } else {
            Linking.openSettings();
          }
        }
        return;
      }

      if (permission.iosAction === 'notifications') {
        // Request notification permission directly
        try {
          if (PermissionsModule?.requestNotificationPermission) {
            await PermissionsModule.requestNotificationPermission();
            checkPermissions();
          }
        } catch (error) {
          Linking.openSettings();
        }
        return;
      }

      // Default: open app settings
      Linking.openSettings();
      return;
    }

    // Android permission handling
    if (Platform.OS === 'android' && permission.androidIntent) {
      // Handle post notifications specially - needs package extra
      if (permission.id === 'postNotifications') {
        Linking.sendIntent(permission.androidIntent, [
          { key: 'android.provider.extra.APP_PACKAGE', value: 'com.scuteapp' },
        ]).catch(() => {
          Linking.openSettings();
        });
        return;
      }

      // Handle alarms permission specially - use native method
      if (permission.id === 'alarms') {
        if (PermissionsModule?.openAlarmPermissionSettings) {
          PermissionsModule.openAlarmPermissionSettings().catch(() => {
            Linking.openSettings();
          });
        } else {
          Linking.openSettings();
        }
        return;
      }

      // Handle battery optimization specially - use native method
      if (permission.id === 'batteryOptimization') {
        if (PermissionsModule?.requestDisableBatteryOptimization) {
          PermissionsModule.requestDisableBatteryOptimization().catch(() => {
            Linking.openSettings();
          });
        } else {
          Linking.openSettings();
        }
        return;
      }

      // Handle device admin specially - use native method
      if (permission.id === 'deviceAdmin') {
        try {
          await PermissionsModule.requestDeviceAdmin();
        } catch {
          Linking.openSettings();
        }
        return;
      }

      // Handle usage access specially - pass package URI to highlight our app
      if (permission.id === 'usageAccess') {
        if (PermissionsModule?.openUsageAccessSettings) {
          PermissionsModule.openUsageAccessSettings().catch(() => {
            Linking.openSettings();
          });
        } else {
          Linking.sendIntent(permission.androidIntent).catch(() => {
            Linking.openSettings();
          });
        }
        return;
      }

      // Handle display overlay specially - pass package URI to open directly to our app
      if (permission.id === 'displayOverlay') {
        if (PermissionsModule?.openOverlaySettings) {
          PermissionsModule.openOverlaySettings().catch(() => {
            Linking.openSettings();
          });
        } else {
          Linking.sendIntent(permission.androidIntent).catch(() => {
            Linking.openSettings();
          });
        }
        return;
      }

      Linking.sendIntent(permission.androidIntent).catch(() => {
        Linking.openSettings();
      });
    } else {
      Linking.openSettings();
    }
  }

  if (isLoading) {
    return (
      <ScreenTransition ref={transitionRef}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="justify-center items-center">
        <LoadingSpinner size={s(48)} />
        <Text style={{ color: colors.textSecondary }} className={`${textSize.base} ${fontFamily.regular} mt-4`}>
          Checking permissions...
        </Text>
      </SafeAreaView>
      </ScreenTransition>
    );
  }

  const grantedCount = totalCount - ungrantedPermissions.length;

  return (
    <ScreenTransition ref={transitionRef}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {displayedPermission ? (
        <Animated.View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: s(32),
            opacity: exitOpacity,
            transform: [{ translateY: exitSlideY }],
          }}
        >
          {/* Large Icon — bounces in from bottom */}
          <Animated.View
            style={{
              transform: [{ translateY: iconTranslateY }],
              opacity: iconOpacity,
              marginBottom: s(32),
            }}
          >
            {SVG_PATHS[displayedPermission.id] ? (
              <Svg width={s(90)} height={s(90)} viewBox={SVG_PATHS[displayedPermission.id].viewBox}>
                {SVG_PATHS[displayedPermission.id].d.map((path, i) => (
                  <Path key={i} d={path} fill={colors.text} />
                ))}
              </Svg>
            ) : (
              <displayedPermission.icon
                size={s(90)}
                color={colors.text}
                weight="fill"
              />
            )}
          </Animated.View>

          {/* Title + Description + Button — fade in after icon lands */}
          <Animated.View style={{ opacity: textOpacity, alignItems: 'center', width: '100%' }}>
            <Text
              style={{ color: colors.text }}
              className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}
            >
              {displayedPermission.title}
            </Text>

            <Text
              style={{ color: colors.textSecondary, marginTop: s(12) }}
              className={`${textSize.base} ${fontFamily.regular} text-center`}
            >
              {displayedPermission.description}
            </Text>

            {/* Enable Button — membership modal style with pulse */}
            <Animated.View style={{ transform: [{ scale: btnPulse }], marginTop: s(40), width: '100%' }}>
              <TouchableOpacity
                onPress={() => openPermissionSettings(displayedPermission)}
                activeOpacity={0.8}
                style={{ backgroundColor: colors.text }}
                className={`${radius.full} ${pill} items-center justify-center`}
              >
                <Text
                  style={{ color: colors.bg }}
                  className={`${textSize.small} ${fontFamily.bold}`}
                >
                  Enable
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Progress */}
            <Text
              style={{ color: colors.textMuted, marginTop: s(24) }}
              className={`${textSize.extraSmall} ${fontFamily.regular}`}
            >
              {grantedCount + 1} of {totalCount}
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
    </ScreenTransition>
  );
}

export default memo(PermissionsChecklistScreen);
