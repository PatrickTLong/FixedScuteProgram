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

const SVG_PATHS: Record<string, { d: string; viewBox: string }> = {
  notification: { d: 'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v440L640-120H200Zm334-460 106-30q5-28-13.5-49T580-680q-25 0-42.5 17.5T520-620q0 11 4 21t10 19Zm-240 70 106-30q4-28-14-49t-46-21q-25 0-42.5 17.5T280-550q0 11 4 21t10 19Zm166 150q69 0 120-45t60-113l-320 90q26 32 62 50t78 18Zm140 160 160-160h-80q-33 0-56.5 23.5T600-280v80Z', viewBox: '0 -960 960 960' },
  accessibility: { d: 'M100,36a28,28,0,1,1,28,28A28,28,0,0,1,100,36ZM227.6,92.57A15.7,15.7,0,0,0,212,80H44a16,16,0,0,0-6.7,30.53l.06,0,53.89,23.73-21.92,83.3a16,16,0,0,0,7.9,20.91A15.83,15.83,0,0,0,84,240a16,16,0,0,0,14.44-9.06L128,180l29.58,51a16,16,0,0,0,29.07-13.35l-21.92-83.3,54-23.76A15.7,15.7,0,0,0,227.6,92.57Z', viewBox: '0 0 256 256' },
  batteryOptimization: { d: 'M160-240q-50 0-85-35t-35-85v-240q0-50 35-85t85-35h562l-64 80H160q-17 0-28.5 11.5T120-600v240q0 17 11.5 28.5T160-320h473l-15 80H160Zm547-40 28-160H600l192-240h21l-28 160h135L728-280h-21Zm-547-80v-240h466L434-360H160Z', viewBox: '0 -960 960 960' },
  deviceAdmin: { d: 'M325-111.5q-73-31.5-127.5-86t-86-127.5Q80-398 80-480.5t31.5-155q31.5-72.5 86-127t127.5-86Q398-880 480-880q32 0 61.5 4.5T600-862v102q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q27 0 47.5 16t28.5 40q39-44 61.5-98.5T800-480q0-11-1-20t-3-20h82q2 11 2 20v20q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480.5-80Q398-80 325-111.5ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 124 80.5 213.5T440-162Zm280-438q-17 0-28.5-11.5T680-640v-120q0-17 11.5-28.5T720-800v-40q0-33 23.5-56.5T800-920q33 0 56.5 23.5T880-840v40q17 0 28.5 11.5T920-760v120q0 17-11.5 28.5T880-600H720Zm40-200h80v-40q0-17-11.5-28.5T800-880q-17 0-28.5 11.5T760-840v40Z', viewBox: '0 -960 960 960' },
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
                <Path d={SVG_PATHS[displayedPermission.id].d} fill={colors.text} />
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
