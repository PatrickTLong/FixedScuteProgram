import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  NativeModules,
  AppState,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { SafeAreaView } from 'react-native-safe-area-context';
import BoxiconsFilled from '../components/BoxiconsFilled';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

const { PermissionsModule } = NativeModules;

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-right-circle" size={size} color={color} />
);

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: string;
  isGranted: boolean;
  androidIntent?: string;
  iosAction?: 'screenTime' | 'notifications' | 'openSettings';
  descriptionStyle?: string;
}

// Android permissions (7 total)
const ANDROID_PERMISSIONS: Permission[] = [
  {
    id: 'notification',
    title: 'Notification Access',
    description: 'Block notifications from restricted apps and send you updates about blocking sessions.',
    icon: 'bx-bell-ring',
    isGranted: false,
    androidIntent: 'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Service',
    description: 'Monitor and block distracting apps.',
    icon: 'bx-universal-access',
    isGranted: false,
    androidIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
  },
  {
    id: 'usageAccess',
    title: 'Usage Access',
    description: 'Monitor app usage and enforce blocking rules.',
    icon: 'bx-chart-area',
    isGranted: false,
    androidIntent: 'android.settings.USAGE_ACCESS_SETTINGS',
  },
  {
    id: 'displayOverlay',
    title: 'Display Overlay',
    description: 'Display blocking screens over restricted apps.',
    icon: 'bx-screen-light',
    isGranted: false,
    androidIntent: 'android.settings.action.MANAGE_OVERLAY_PERMISSION',
  },
  {
    id: 'postNotifications',
    title: 'Show Notifications',
    description: 'Display blocking status and alerts.',
    icon: 'bx-message-circle-notification',
    isGranted: false,
    androidIntent: 'android.settings.APP_NOTIFICATION_SETTINGS',
  },
  {
    id: 'batteryOptimization',
    title: 'Unrestricted Battery',
    description: 'Ensure scheduled presets work reliably even when the app is closed.',
    icon: 'bx-battery',
    isGranted: false,
    androidIntent: 'battery_optimization_request',
  },
  {
    id: 'deviceAdmin',
    title: 'Device Admin',
    description: 'Prevent Scute from being uninstalled during active blocking sessions.',
    icon: 'bx-shield',
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
    icon: 'bx-timer',
    isGranted: false,
    iosAction: 'screenTime',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Receive alerts when blocking sessions start and end.',
    icon: 'bx-bell',
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

  const grantedCount = useMemo(() => permissions.filter(p => p.isGranted).length, [permissions]);
  const totalCount = permissions.length;
  const allGranted = grantedCount === totalCount;
  const missingCount = totalCount - grantedCount;

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="justify-center items-center">
        <LoadingSpinner size={s(32)} />
        <Text style={{ color: colors.textSecondary }} className={`${textSize.base} ${fontFamily.regular} mt-4`}>
          Checking permissions...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: s(24), paddingTop: s(32), paddingBottom: s(16) }}
      >
        {/* Title */}
        <View className="flex-row items-center justify-center mb-3">
          <MaterialCommunityIcons name="hammer-wrench" size={s(28)} color={colors.text} style={{ marginRight: s(10) }} />
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>
            {missingCount} permission{missingCount !== 1 ? 's' : ''} missing
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} mb-8 px-4`}>
          Scute needs these permissions to block distractions & cheats.
        </Text>

        {/* Permission Cards */}
        {permissions.filter(p => !p.isGranted).map((permission) => (
          <TouchableOpacity
            key={permission.id}
            onPress={() => openPermissionSettings(permission)}
            activeOpacity={0.7}
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
            className={`flex-row items-center p-4 ${radius['2xl']} mb-3`}
          >
            <BoxiconsFilled
              name={permission.icon}
              size={s(iconSize.toggleRow)}
              color={colors.text}
              style={{ marginRight: s(14) }}
            />
            <View className="flex-1 mr-4">
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
                {permission.title}
              </Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                {permission.description}
              </Text>
            </View>

            <ChevronRightIcon size={s(iconSize.chevron)} color={colors.text} />
          </TouchableOpacity>
        ))}

        {/* Granted permissions (collapsed) */}
        {grantedCount > 0 && (
          <View className="mt-4">
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mb-2`}>
              Enabled:
            </Text>
            {permissions.filter(p => p.isGranted).map((permission) => (
              <View
                key={permission.id}
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
                className={`flex-row items-center py-3 px-4 ${radius.xl} mb-2`}
              >
                <BoxiconsFilled
                  name={permission.icon}
                  size={s(iconSize.toggleRow)}
                  color={colors.green}
                  style={{ marginRight: s(14) }}
                />
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>
                  {permission.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(PermissionsChecklistScreen);
