import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Vibration, NativeModules, AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';
import {
  deleteAccount,
  updateLockStatus,
  getPresets,
  resetPresets,
  deactivateAllPresets,
  useEmergencyTapout,
  savePreset,
  Preset,
  EmergencyTapoutStatus,
  invalidateUserCaches,
  clearAuthToken,
  getMembershipStatus,
} from '../services/cardApi';
import type { RootStackParamList } from '../navigation/types';

const { BlockingModule, PermissionsModule, ScheduleModule } = NativeModules;

// Track which scheduled preset we've already navigated for
let lastNavigatedScheduledPresetId: string | null = null;

export type AuthState = 'auth' | 'terms' | 'permissions' | 'membership' | 'main';

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
}

interface AuthContextValue {
  userEmail: string;
  authState: AuthState;
  isInitializing: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
  handleLogin: (email: string) => Promise<void>;
  handleTermsAccepted: () => Promise<void>;
  handlePermissionsComplete: () => Promise<void>;
  handleMembershipComplete: () => void;
  handleLogout: () => Promise<void>;
  handleResetAccount: () => Promise<{ success: boolean; error?: string }>;
  handleDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
  // Info modal
  modalState: ModalState;
  showModal: (title: string, message: string) => void;
  closeModal: () => void;
  // Emergency tapout
  emergencyTapoutModalVisible: boolean;
  setEmergencyTapoutModalVisible: (v: boolean) => void;
  tapoutStatus: EmergencyTapoutStatus | null;
  setTapoutStatus: (s: EmergencyTapoutStatus | null) => void;
  activePresetForTapout: Preset | null;
  setActivePresetForTapout: (p: Preset | null) => void;
  tapoutLoading: boolean;
  lockEndsAtForTapout: string | null;
  setLockEndsAtForTapout: (s: string | null) => void;
  handleUseEmergencyTapout: () => Promise<void>;
  // Navigation ref for programmatic navigation
  navigationRef: ReturnType<typeof createNavigationContainerRef<RootStackParamList>>;
  // Shared presets state across all mounted screens
  sharedPresets: Preset[];
  setSharedPresets: React.Dispatch<React.SetStateAction<Preset[]>>;
  sharedPresetsLoaded: boolean;
  setSharedPresetsLoaded: (v: boolean) => void;
  // Shared lock status across all mounted screens
  sharedIsLocked: boolean;
  setSharedIsLocked: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('auth');
  const [userEmail, setUserEmail] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Shared presets state - single source of truth across all mounted screens
  const [sharedPresets, setSharedPresets] = useState<Preset[]>([]);
  const [sharedPresetsLoaded, setSharedPresetsLoaded] = useState(false);

  // Shared lock status - single source of truth across all mounted screens
  const [sharedIsLocked, setSharedIsLocked] = useState(false);

  // Info modal
  const [modalState, setModalState] = useState<ModalState>({ visible: false, title: '', message: '' });

  // Emergency tapout
  const [emergencyTapoutModalVisible, setEmergencyTapoutModalVisible] = useState(false);
  const [tapoutStatus, setTapoutStatus] = useState<EmergencyTapoutStatus | null>(null);
  const [activePresetForTapout, setActivePresetForTapout] = useState<Preset | null>(null);
  const [tapoutLoading, setTapoutLoading] = useState(false);
  const [lockEndsAtForTapout, setLockEndsAtForTapout] = useState<string | null>(null);

  const showModal = useCallback((title: string, message: string) => {
    setModalState({ visible: true, title, message });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Emergency tapout handler
  const handleUseEmergencyTapout = useCallback(async () => {
    if (!activePresetForTapout?.allowEmergencyTapout) {
      showModal('Not Available', 'Emergency tapout is not enabled for this preset.');
      setEmergencyTapoutModalVisible(false);
      return;
    }

    if ((tapoutStatus?.remaining ?? 0) <= 0) {
      showModal('No Tapouts Left', 'You have no emergency tapouts remaining.');
      setEmergencyTapoutModalVisible(false);
      return;
    }

    setTapoutLoading(true);
    try {
      const result = await useEmergencyTapout(userEmail);
      if (result.success) {
        setEmergencyTapoutModalVisible(false);

        if (BlockingModule) {
          await BlockingModule.forceUnlock();
        }

        if (activePresetForTapout) {
          const deactivatedPreset = { ...activePresetForTapout, isActive: false };
          await savePreset(userEmail, deactivatedPreset);

          if (activePresetForTapout.isScheduled && ScheduleModule) {
            try {
              await ScheduleModule.cancelPresetAlarm(activePresetForTapout.id);
            } catch (e) {
              // Failed to cancel preset alarm
            }
          }
        }

        await updateLockStatus(userEmail, false, null);
        invalidateUserCaches(userEmail);
        // Update shared presets to reflect deactivation
        if (activePresetForTapout) {
          setSharedPresets(prev => prev.map(p =>
            p.id === activePresetForTapout.id ? { ...p, isActive: false } : p
          ));
        }
        Vibration.vibrate(100);
        showModal('Unlocked', `Phone unlocked. You have ${result.remaining} emergency tapout${result.remaining !== 1 ? 's' : ''} remaining.`);
        setRefreshTrigger(prev => prev + 1);
      } else {
        showModal('Failed', 'Could not use emergency tapout. Please try again.');
      }
    } catch (error) {
      showModal('Error', 'Something went wrong. Please try again.');
    } finally {
      setTapoutLoading(false);
    }
  }, [userEmail, tapoutStatus, activePresetForTapout, showModal]);

  // Determine auth state from login status
  const checkLoginStatus = useCallback(async () => {
    const email = await AsyncStorage.getItem('user_email');

    if (email) {
      setUserEmail(email);

      const tosAccepted = await AsyncStorage.getItem('tos_accepted');
      if (tosAccepted !== 'true') {
        setAuthState('terms');
        setIsInitializing(false);
        return;
      }

      try {
        if (PermissionsModule) {
          const states = await PermissionsModule.checkAllPermissions();
          const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'batteryOptimization', 'deviceAdmin'];
          const allGranted = requiredPermissions.every((perm: string) => states[perm]);

          if (allGranted) {
            try {
              const membership = await getMembershipStatus(email, true);
              if (membership.trialExpired && !membership.isMember) {
                await deactivateAllPresets(email);
                await ScheduleModule?.saveScheduledPresets('[]');
                setAuthState('membership');
                setIsInitializing(false);
                return;
              }
            } catch (error) {
              // Error checking membership, proceed to main
            }
            setAuthState('main');
            setIsInitializing(false);
            return;
          }
        }
      } catch (error) {
        // Error checking permissions
      }

      setAuthState('permissions');
    }
    setIsInitializing(false);
  }, []);

  const handleLogin = useCallback(async (email: string) => {
    setUserEmail(email);
    await AsyncStorage.setItem('user_email', email);

    const tosAccepted = await AsyncStorage.getItem('tos_accepted');
    if (tosAccepted !== 'true') {
      setAuthState('terms');
      return;
    }

    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'alarms', 'deviceAdmin'];
        const allGranted = requiredPermissions.every((perm: string) => states[perm]);

        if (allGranted) {
          try {
            const membership = await getMembershipStatus(email, true);
            if (membership.trialExpired && !membership.isMember) {
              await deactivateAllPresets(email);
              await ScheduleModule?.saveScheduledPresets('[]');
              setAuthState('membership');
              return;
            }
          } catch (error) {
            // Error checking membership, proceed to main
          }
          setAuthState('main');
          return;
        }
      }
    } catch (error) {
      // Error checking permissions
    }

    setAuthState('permissions');
  }, []);

  const handleTermsAccepted = useCallback(async () => {
    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'alarms', 'deviceAdmin'];
        const allGranted = requiredPermissions.every((perm: string) => states[perm]);

        if (allGranted) {
          try {
            const membership = await getMembershipStatus(userEmail, true);
            if (membership.trialExpired && !membership.isMember) {
              await deactivateAllPresets(userEmail);
              await ScheduleModule?.saveScheduledPresets('[]');
              setAuthState('membership');
              return;
            }
          } catch (error) {
            // Error checking membership, proceed to main
          }
          setAuthState('main');
          return;
        }
      }
    } catch (error) {
      // Error checking permissions
    }

    setAuthState('permissions');
  }, [userEmail]);

  const handlePermissionsComplete = useCallback(async () => {
    try {
      const membership = await getMembershipStatus(userEmail, true);
      if (membership.trialExpired && !membership.isMember) {
        await deactivateAllPresets(userEmail);
        await ScheduleModule?.saveScheduledPresets('[]');
        setAuthState('membership');
        return;
      }
    } catch (error) {
      // Error checking membership, proceed to main
    }
    setAuthState('main');
  }, [userEmail]);

  const handleMembershipComplete = useCallback(() => {
    setAuthState('main');
  }, []);

  const handleLogout = useCallback(async () => {
    if (userEmail) {
      await deactivateAllPresets(userEmail);
      await ScheduleModule?.saveScheduledPresets('[]');
      invalidateUserCaches(userEmail);
    }
    setSharedPresets([]);
    setSharedPresetsLoaded(false);
    await AsyncStorage.removeItem('user_email');
    await clearAuthToken();
    setUserEmail('');
    setAuthState('auth');
  }, [userEmail]);

  const handleResetAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await ScheduleModule?.saveScheduledPresets('[]');
      const result = await resetPresets(userEmail);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to reset presets' };
      }
      // Clear caches, then re-fetch so shared state has fresh data before spinner dismisses
      invalidateUserCaches(userEmail);
      const freshPresets = await getPresets(userEmail, true);
      setSharedPresets(freshPresets);
      setSharedPresetsLoaded(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset account' };
    }
  }, [userEmail]);

  const handleDeleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await ScheduleModule?.saveScheduledPresets('[]');
      const result = await deleteAccount(userEmail);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to delete account' };
      }
      // Clear all shared state and caches
      invalidateUserCaches(userEmail);
      setSharedPresets([]);
      setSharedPresetsLoaded(false);
      await AsyncStorage.clear();
      await clearAuthToken();
      setUserEmail('');
      setAuthState('auth');
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete account' };
    }
  }, [userEmail]);

  // Check if any scheduled preset is currently active
  const checkActiveScheduledPreset = useCallback(async () => {
    if (!userEmail || authState !== 'main') return;

    try {
      const presets = await getPresets(userEmail);
      // Update shared state so all screens see fresh preset data
      setSharedPresets(presets);
      setSharedPresetsLoaded(true);

      const now = Date.now();

      for (const preset of presets) {
        if (!preset.isScheduled || !preset.isActive) continue;
        if (!preset.scheduleStartDate || !preset.scheduleEndDate) continue;

        const startTime = new Date(preset.scheduleStartDate).getTime();
        const endTime = new Date(preset.scheduleEndDate).getTime();

        if (now >= startTime && now < endTime) {
          if (lastNavigatedScheduledPresetId !== preset.id) {
            lastNavigatedScheduledPresetId = preset.id;
            invalidateUserCaches(userEmail);

            // Navigate to home tab
            if (navigationRef.isReady()) {
              (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
            }
            setRefreshTrigger(prev => prev + 1);
          }
          return;
        }
      }

      lastNavigatedScheduledPresetId = null;
    } catch (error) {
      // Error checking active scheduled preset
    }
  }, [userEmail, authState]);

  // Check if app was launched from scheduled preset alarm
  const checkScheduledPresetLaunch = useCallback(async () => {
    try {
      if (!ScheduleModule) return;
      const launchData = await ScheduleModule.getScheduledLaunchData();
      if (launchData?.launched) {
        await ScheduleModule.clearScheduledLaunchData();
        if (userEmail) {
          invalidateUserCaches(userEmail);
        }
        if (authState === 'main') {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
          }
          setRefreshTrigger(prev => prev + 1);
        }
      }
    } catch (error) {
      // Error checking scheduled launch
    }
  }, [authState, userEmail]);

  // Check if app was launched from blocked overlay
  const checkBlockedOverlayLaunch = useCallback(async () => {
    try {
      if (!ScheduleModule) return;
      const launchData = await ScheduleModule.getBlockedOverlayLaunchData();
      if (launchData?.fromBlockedOverlay) {
        if (authState === 'main') {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
          }
          setRefreshTrigger(prev => prev + 1);
        }
      }
    } catch (error) {
      // Error checking blocked overlay launch
    }
  }, [authState]);

  // Check permissions when app comes to foreground
  const checkPermissionsOnForeground = useCallback(async () => {
    if (!userEmail || authState !== 'main') return;

    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'deviceAdmin'];
        const missingPermission = requiredPermissions.some((perm: string) => !states[perm]);

        if (missingPermission) {
          setAuthState('permissions');
        }
      }
    } catch (error) {
      // Failed to check permissions
    }
  }, [userEmail, authState]);

  // Initial check
  useEffect(() => {
    checkLoginStatus();
    checkScheduledPresetLaunch();
    checkBlockedOverlayLaunch();
  }, []);

  // AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissionsOnForeground();
        checkScheduledPresetLaunch();
        checkBlockedOverlayLaunch();
        checkActiveScheduledPreset();
      }
    });

    return () => subscription.remove();
  }, [checkPermissionsOnForeground, checkScheduledPresetLaunch, checkBlockedOverlayLaunch, checkActiveScheduledPreset]);

  // Session changed listener
  useEffect(() => {
    if (!userEmail || authState !== 'main') return;

    checkActiveScheduledPreset();

    const subscription = DeviceEventEmitter.addListener('onSessionChanged', async () => {
      invalidateUserCaches(userEmail);

      // Fetch fresh presets and update shared state immediately
      try {
        const freshPresets = await getPresets(userEmail, true);
        setSharedPresets(freshPresets);
        setSharedPresetsLoaded(true);
      } catch (e) {
        // Will be refreshed by loadStats via refreshTrigger below
      }

      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
      }
      setRefreshTrigger(prev => prev + 1);
    });

    return () => subscription.remove();
  }, [userEmail, authState, checkActiveScheduledPreset]);

  const value: AuthContextValue = {
    userEmail,
    authState,
    isInitializing,
    refreshTrigger,
    triggerRefresh,
    handleLogin,
    handleTermsAccepted,
    handlePermissionsComplete,
    handleMembershipComplete,
    handleLogout,
    handleResetAccount,
    handleDeleteAccount,
    modalState,
    showModal,
    closeModal,
    emergencyTapoutModalVisible,
    setEmergencyTapoutModalVisible,
    tapoutStatus,
    setTapoutStatus,
    activePresetForTapout,
    setActivePresetForTapout,
    tapoutLoading,
    lockEndsAtForTapout,
    setLockEndsAtForTapout,
    handleUseEmergencyTapout,
    navigationRef,
    sharedPresets,
    setSharedPresets,
    sharedPresetsLoaded,
    setSharedPresetsLoaded,
    sharedIsLocked,
    setSharedIsLocked,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
