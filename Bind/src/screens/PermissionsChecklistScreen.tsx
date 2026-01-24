import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  NativeModules,
  AppState,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ProgressBar from '../components/ProgressBar';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';

const { DeviceAdminModule, PermissionsModule } = NativeModules;

// Chevron right icon
const ChevronRightIcon = ({ size = 24, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface Props {
  onComplete: () => void;
}

interface Permission {
  id: string;
  title: string;
  description: string;
  isGranted: boolean;
  androidIntent?: string;
  iosAction?: 'screenTime' | 'notifications' | 'openSettings';
}

// Android permissions (8 total)
const ANDROID_PERMISSIONS: Permission[] = [
  {
    id: 'notification',
    title: 'Notification Access',
    description: 'Monitor notifications and send you updates about blocking sessions.',
    isGranted: false,
    androidIntent: 'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Service',
    description: 'Monitor and block distracting apps.',
    isGranted: false,
    androidIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
  },
  {
    id: 'usageAccess',
    title: 'Usage Access',
    description: 'Monitor app usage and enforce blocking rules.',
    isGranted: false,
    androidIntent: 'android.settings.USAGE_ACCESS_SETTINGS',
  },
  {
    id: 'displayOverlay',
    title: 'Display Overlay',
    description: 'Display blocking screens over restricted apps.',
    isGranted: false,
    androidIntent: 'android.settings.action.MANAGE_OVERLAY_PERMISSION',
  },
  {
    id: 'deviceAdmin',
    title: 'Device Admin',
    description: 'Prevent uninstalling blocked apps during focus sessions.',
    isGranted: false,
    androidIntent: 'device_admin_request',
  },
  {
    id: 'postNotifications',
    title: 'Show Notifications',
    description: 'Display blocking status and alerts.',
    isGranted: false,
    androidIntent: 'android.settings.APP_NOTIFICATION_SETTINGS',
  },
  {
    id: 'alarms',
    title: 'Alarms & Reminders',
    description: 'Schedule presets to automatically activate at specific times.',
    isGranted: false,
    androidIntent: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
  },
  {
    id: 'batteryOptimization',
    title: 'Unrestricted Battery',
    description: 'Ensure scheduled presets work reliably even when the app is closed.',
    isGranted: false,
    androidIntent: 'battery_optimization_request',
  },
];

// iOS permissions (2 total - much simpler!)
const IOS_PERMISSIONS: Permission[] = [
  {
    id: 'screenTime',
    title: 'Screen Time Access',
    description: 'Block apps and websites during focus sessions.',
    isGranted: false,
    iosAction: 'screenTime',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Receive alerts when blocking sessions start and end.',
    isGranted: false,
    iosAction: 'notifications',
  },
];

// Get the default permissions based on platform
const DEFAULT_PERMISSIONS = Platform.OS === 'ios' ? IOS_PERMISSIONS : ANDROID_PERMISSIONS;


function PermissionsChecklistScreen({ onComplete }: Props) {
  const { colors } = useTheme();
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const grantedCount = permissions.filter(p => p.isGranted).length;
  const totalCount = permissions.length;
  const allGranted = grantedCount === totalCount;
  const missingCount = totalCount - grantedCount;

  // Check all permissions from native module
  const checkPermissions = useCallback(async () => {
    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();

        if (Platform.OS === 'ios') {
          // iOS returns { screenTime: bool, notifications: bool }
          setPermissions(prev =>
            prev.map(p => ({
              ...p,
              isGranted: states[p.id] ?? false,
            }))
          );
        } else {
          // Android returns all permission states
          setPermissions(prev =>
            prev.map(p => ({
              ...p,
              isGranted: states[p.id] ?? false,
            }))
          );
        }
      }
    } catch (error) {
      // Silent failure - permissions will show as not granted
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Auto-complete if all permissions are granted
  useEffect(() => {
    if (!isLoading && allGranted) {
      onComplete();
    }
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
      // Handle device admin request specially
      if (permission.androidIntent === 'device_admin_request') {
        try {
          if (DeviceAdminModule) {
            const isActive = await DeviceAdminModule.isDeviceAdminActive();
            if (isActive) {
              // Already active, refresh permissions
              checkPermissions();
              return;
            }

            await DeviceAdminModule.requestEnableDeviceAdmin();
            // Refresh after request completes
            checkPermissions();
          } else {
            Alert.alert('Error', 'Device admin module not available');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to request device admin permission');
        }
        return;
      }

      // Handle post notifications specially - needs package extra
      if (permission.id === 'postNotifications') {
        Linking.sendIntent(permission.androidIntent, [
          { key: 'android.provider.extra.APP_PACKAGE', value: 'com.bind' },
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
        <Lottie
          source={require('../frontassets/Loading.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: 150, height: 150 }}
        />
        <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mt-4">
          Checking permissions...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Progress Bar */}
      <ProgressBar currentStep={grantedCount} totalSteps={totalCount} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 }}
      >
        {/* Title */}
        <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold text-center mb-3">
          {missingCount} permission{missingCount !== 1 ? 's' : ''} missing
        </Text>

        {/* Subtitle */}
        <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito mb-8 px-4">
          Scute needs these permissions to block distractions & cheats.
        </Text>

        {/* Permission Cards */}
        {permissions.filter(p => !p.isGranted).map((permission) => (
          <TouchableOpacity
            key={permission.id}
            onPress={() => { lightTap(); openPermissionSettings(permission); }}
            activeOpacity={0.7}
            style={{ backgroundColor: colors.card }}
            className="flex-row items-center p-4 rounded-2xl mb-3"
          >
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-base font-nunito-semibold mb-1">
                {permission.title}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                {permission.description}
              </Text>
            </View>

            <ChevronRightIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ))}

        {/* Granted permissions (collapsed) */}
        {grantedCount > 0 && (
          <View className="mt-4">
            <Text style={{ color: colors.textMuted }} className="text-sm font-nunito mb-2 uppercase tracking-wider">
              Enabled ({grantedCount})
            </Text>
            {permissions.filter(p => p.isGranted).map((permission) => (
              <View
                key={permission.id}
                style={{ backgroundColor: `${colors.card}80` }}
                className="flex-row items-center py-3 px-4 rounded-xl mb-2"
              >
                <View style={{ backgroundColor: '#22c55e' }} className="w-6 h-6 rounded items-center justify-center mr-3">
                  <View style={{ borderColor: '#FFFFFF' }} className="w-2.5 h-4 border-r-2 border-b-2 rotate-45 -mt-1" />
                </View>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
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
