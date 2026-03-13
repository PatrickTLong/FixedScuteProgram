import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, AppState, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';
import {
  deleteAccount,
  getPresets,
  getEmergencyTapoutStatus,
  resetPresets,
  useEmergencyTapout,
  savePreset,
  Preset,
  LockStatus,
  EmergencyTapoutStatus,
  invalidateUserCaches,
  clearAuthToken,
  getMembershipStatus,
  isFirstLoad,
  clearAllCaches,
  markInitialLoadComplete,
  getUserFlags,
  setUserFlag,
} from '../services/cardApi';
import type { RootStackParamList } from '../navigation/types';

const { BlockingModule, PermissionsModule, ScheduleModule, UsageStatsModule } = NativeModules;

interface AppUsage {
  packageName: string;
  appName: string;
  timeInForeground: number;
  icon?: string;
}

interface StatsCache {
  screenTime: number;
  appUsages: AppUsage[];
}

type StatsPeriod = 'today' | 'week' | 'month';

// Track which scheduled preset we've already navigated for
let lastNavigatedScheduledPresetId: string | null = null;

export type AuthState = 'auth' | 'terms' | 'permissions' | 'onboarding' | 'onboarding_loading' | 'membership' | 'main';

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
  handleOnboardingComplete: (choice: 'social_media' | 'xxx' | 'both' | 'none') => void;
  handleOnboardingLoadingComplete: () => void;
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
  // Shared lock status across all mounted screens
  sharedLockStatus: LockStatus;
  setSharedLockStatus: React.Dispatch<React.SetStateAction<LockStatus>>;
  sharedIsLocked: boolean; // derived read-only from sharedLockStatus.isLocked
  // Centralized refresh functions
  refreshPresets: (skipCache?: boolean) => Promise<Preset[]>;
  refreshLockStatus: (skipCache?: boolean) => Promise<LockStatus>;
  refreshTapoutStatus: (skipCache?: boolean) => Promise<EmergencyTapoutStatus>;
  refreshAll: (skipCache?: boolean) => Promise<{ presets: Preset[]; lockStatus: LockStatus; tapoutStatus: EmergencyTapoutStatus }>;
  handleReconnect: () => Promise<void>;
  // Onboarding
  onboardingChoice: 'social_media' | 'xxx' | 'both' | 'none' | null;
  // Shared usage stats (prefetched during HomeScreen load)
  sharedStats: Record<StatsPeriod, StatsCache | null>;
  setSharedStats: React.Dispatch<React.SetStateAction<Record<StatsPeriod, StatsCache | null>>>;
  prefetchStats: () => Promise<void>;
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
  const [sharedLockStatus, _setSharedLockStatus] = useState<LockStatus>({
    isLocked: false, lockStartedAt: null, lockEndsAt: null,
  });

  // Shallow-equality wrapper: prevents re-renders when the same lock state is set multiple times
  // (e.g., multiple code paths setting isLocked: false on foreground return)
  const setSharedLockStatus = useCallback<React.Dispatch<React.SetStateAction<LockStatus>>>((action) => {
    _setSharedLockStatus(prev => {
      const next = typeof action === 'function' ? (action as (prev: LockStatus) => LockStatus)(prev) : action;
      if (prev.isLocked === next.isLocked && prev.lockStartedAt === next.lockStartedAt && prev.lockEndsAt === next.lockEndsAt) {
        return prev; // Same reference = no re-render
      }
      return next;
    });
  }, []);

  // Info modal
  const [modalState, setModalState] = useState<ModalState>({ visible: false, title: '', message: '' });

  // Emergency tapout
  const [emergencyTapoutModalVisible, setEmergencyTapoutModalVisible] = useState(false);
  const [tapoutStatus, setTapoutStatus] = useState<EmergencyTapoutStatus | null>(null);
  const [activePresetForTapout, setActivePresetForTapout] = useState<Preset | null>(null);
  const [tapoutLoading, setTapoutLoading] = useState(false);
  const [lockEndsAtForTapout, setLockEndsAtForTapout] = useState<string | null>(null);

  // Shared usage stats - prefetched during HomeScreen load so StatsScreen is instant
  const [sharedStats, setSharedStats] = useState<Record<StatsPeriod, StatsCache | null>>({
    today: null,
    week: null,
    month: null,
  });

  const prefetchStats = useCallback(async () => {
    if (Platform.OS !== 'android' || !UsageStatsModule) return;
    try {
      const [screenTime, apps] = await Promise.all([
        UsageStatsModule.getScreenTime('month'),
        UsageStatsModule.getAllAppsUsage('month'),
      ]);
      setSharedStats(prev => ({
        ...prev,
        month: { screenTime, appUsages: apps || [] },
      }));
    } catch {
      // Usage stats unavailable
    }
  }, []);

  const showModal = useCallback((title: string, message: string) => {
    setModalState({ visible: true, title, message });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Centralized data refresh functions - single source of truth for all data fetching
  const refreshInProgressRef = useRef(false);
  // Refs to track current state for the refreshAll early-return guard
  // (avoids putting state in refreshAll's dependency array, which causes infinite loops)
  const sharedPresetsRef = useRef(sharedPresets);
  const sharedLockStatusRef = useRef(sharedLockStatus);
  const tapoutStatusRef = useRef(tapoutStatus);
  sharedPresetsRef.current = sharedPresets;
  sharedLockStatusRef.current = sharedLockStatus;
  tapoutStatusRef.current = tapoutStatus;

  const refreshPresets = useCallback(async (skipCache = false): Promise<Preset[]> => {
    if (!userEmail) return [];
    const presets = await getPresets(userEmail, skipCache);
    // isActive is device-local — hydrate from native SharedPreferences
    try {
      if (BlockingModule?.getSessionInfo) {
        const info = await BlockingModule.getSessionInfo();
        const nativeActiveId = info.activePresetId ?? null;
        if (nativeActiveId) {
          presets.forEach(p => { p.isActive = p.id === nativeActiveId; });
        }
      }
    } catch {}
    setSharedPresets(presets);
    setSharedPresetsLoaded(true);
    return presets;
  }, [userEmail]);

  const refreshLockStatus = useCallback(async (): Promise<LockStatus> => {
    const defaultStatus: LockStatus = { isLocked: false, lockStartedAt: null, lockEndsAt: null };
    if (!userEmail || !BlockingModule?.getSessionInfo) return defaultStatus;
    try {
      const info = await BlockingModule.getSessionInfo();
      const status: LockStatus = {
        isLocked: info.isBlocking ?? false,
        lockStartedAt: info.lockStartedAt ?? null,
        lockEndsAt: info.lockEndsAt ?? null,
      };
      setSharedLockStatus(status);
      return status;
    } catch {
      return defaultStatus;
    }
  }, [userEmail]);

  const refreshTapoutStatus = useCallback(async (skipCache = false): Promise<EmergencyTapoutStatus> => {
    if (!userEmail) return { remaining: 0, nextRefillDate: null };
    const tapout = await getEmergencyTapoutStatus(userEmail, skipCache);
    setTapoutStatus(tapout);
    return tapout;
  }, [userEmail]);

  const refreshAll = useCallback(async (skipCache = false): Promise<{ presets: Preset[]; lockStatus: LockStatus; tapoutStatus: EmergencyTapoutStatus }> => {
    if (refreshInProgressRef.current) {
      // Already refreshing — return current state via refs (stable, no re-render loop)
      return {
        presets: sharedPresetsRef.current,
        lockStatus: sharedLockStatusRef.current,
        tapoutStatus: tapoutStatusRef.current ?? { remaining: 0, nextRefillDate: null },
      };
    }
    refreshInProgressRef.current = true;
    try {
      // Lock status is now device-local — read from native BlockingModule
      const defaultLockStatus: LockStatus = { isLocked: false, lockStartedAt: null, lockEndsAt: null };
      const [presets, tapout] = await Promise.all([
        getPresets(userEmail, skipCache),
        getEmergencyTapoutStatus(userEmail, skipCache),
      ]);
      let lockStatus = defaultLockStatus;
      try {
        if (BlockingModule?.getSessionInfo) {
          const info = await BlockingModule.getSessionInfo();
          lockStatus = {
            isLocked: info.isBlocking ?? false,
            lockStartedAt: info.lockStartedAt ?? null,
            lockEndsAt: info.lockEndsAt ?? null,
          };
          // isActive is device-local — hydrate from native SharedPreferences
          const nativeActiveId = info.activePresetId ?? null;
          if (nativeActiveId) {
            presets.forEach(p => { p.isActive = p.id === nativeActiveId; });
          }
        }
      } catch {
        // Native call failed — use default (unlocked)
      }
      setSharedPresets(presets);
      setSharedPresetsLoaded(true);
      // NOTE: Lock status is NOT set here — callers (loadStats) handle it after
      // checking for timer expiration, preventing a false→true→false bounce on foreground return.
      setTapoutStatus(tapout);
      return { presets, lockStatus, tapoutStatus: tapout };
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [userEmail]);

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

        invalidateUserCaches(userEmail);
        // Update shared presets to reflect deactivation
        if (activePresetForTapout) {
          setSharedPresets(prev => prev.map(p =>
            p.id === activePresetForTapout.id ? { ...p, isActive: false } : p
          ));
        }
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

      // Fetch per-user flags from backend (source of truth)
      let flags = { tosAccepted: false, onboardingComplete: false };
      try {
        flags = await getUserFlags();
        // Cache locally for fast checks within the session
        await AsyncStorage.setItem('tos_accepted', flags.tosAccepted ? 'true' : 'false');
        await AsyncStorage.setItem('onboarding_complete', flags.onboardingComplete ? 'true' : 'false');
      } catch {
        // Fallback to local cache if backend unreachable
        flags.tosAccepted = (await AsyncStorage.getItem('tos_accepted')) === 'true';
        flags.onboardingComplete = (await AsyncStorage.getItem('onboarding_complete')) === 'true';
      }

      if (!flags.tosAccepted) {
        setAuthState('terms');
        setIsInitializing(false);
        return;
      }

      try {
        if (PermissionsModule) {
          const states = await PermissionsModule.checkAllPermissions();
          const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'batteryOptimization', 'deviceAdmin'];
          const allGranted = requiredPermissions.every((perm: string) => states[perm]);

          if (allGranted) {
            if (!flags.onboardingComplete) {
              setAuthState('onboarding');
              setIsInitializing(false);
              return;
            }

            try {
              const membership = await getMembershipStatus(email, true);
              if (membership.trialExpired && !membership.isMember) {
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

    // Fetch per-user flags from backend
    let flags = { tosAccepted: false, onboardingComplete: false };
    try {
      flags = await getUserFlags();
      await AsyncStorage.setItem('tos_accepted', flags.tosAccepted ? 'true' : 'false');
      await AsyncStorage.setItem('onboarding_complete', flags.onboardingComplete ? 'true' : 'false');
    } catch {
      // New user — defaults are fine (both false)
    }

    if (!flags.tosAccepted) {
      setAuthState('terms');
      return;
    }

    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'batteryOptimization', 'deviceAdmin'];
        const allGranted = requiredPermissions.every((perm: string) => states[perm]);

        if (allGranted) {
          if (!flags.onboardingComplete) {
            setAuthState('onboarding');
            return;
          }

          try {
            const membership = await getMembershipStatus(email, true);
            if (membership.trialExpired && !membership.isMember) {
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
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'batteryOptimization', 'deviceAdmin'];
        const allGranted = requiredPermissions.every((perm: string) => states[perm]);

        if (allGranted) {
          // Check onboarding
          const onboardingDone = await AsyncStorage.getItem('onboarding_complete');
          if (onboardingDone !== 'true') {
            setAuthState('onboarding');
            return;
          }

          try {
            const membership = await getMembershipStatus(userEmail, true);
            if (membership.trialExpired && !membership.isMember) {
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
    // Check if onboarding is complete before going to main
    const onboardingDone = await AsyncStorage.getItem('onboarding_complete');
    if (onboardingDone !== 'true') {
      setAuthState('onboarding');
      return;
    }

    setAuthState('main');
    // Check membership in background — redirect if trial expired
    try {
      const membership = await getMembershipStatus(userEmail, true);
      if (membership.trialExpired && !membership.isMember) {
        await ScheduleModule?.saveScheduledPresets('[]');
        setAuthState('membership');
      }
    } catch (error) {
      // Error checking membership, already on main
    }
  }, [userEmail]);

  // Track which preset category was chosen during onboarding (used by HomeScreen to navigate)
  const [onboardingChoice, setOnboardingChoice] = useState<'social_media' | 'xxx' | 'both' | 'none' | null>(null);

  const handleOnboardingComplete = useCallback((choice: 'social_media' | 'xxx' | 'both' | 'none') => {
    setOnboardingChoice(choice);
    // Always show loading screen (fetches app state / builds preset)
    setAuthState('onboarding_loading');
    // Check membership in background
    (async () => {
      try {
        const membership = await getMembershipStatus(userEmail, true);
        if (membership.trialExpired && !membership.isMember) {
          await ScheduleModule?.saveScheduledPresets('[]');
          setAuthState('membership');
        }
      } catch (error) {
        // Error checking membership, already on main
      }
    })();
  }, [userEmail]);

  const handleOnboardingLoadingComplete = useCallback(() => {
    setAuthState('main');
  }, []);

  const handleMembershipComplete = useCallback(() => {
    setAuthState('main');
  }, []);

  const handleLogout = useCallback(async () => {
    if (userEmail) {
      try {
        if (BlockingModule) await BlockingModule.forceUnlock();
      } catch (e) {}
      await ScheduleModule?.saveScheduledPresets('[]');
      invalidateUserCaches(userEmail);
    }
    setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
    setSharedPresets([]);
    setSharedPresetsLoaded(false);
    await AsyncStorage.removeItem('user_email');
    await clearAuthToken();
    setUserEmail('');
    setAuthState('auth');
  }, [userEmail]);

  const handleResetAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        if (BlockingModule) await BlockingModule.forceUnlock();
      } catch (e) {}
      await ScheduleModule?.saveScheduledPresets('[]');
      const presetsResult = await resetPresets(userEmail);
      if (!presetsResult.success) {
        return { success: false, error: presetsResult.error || 'Failed to reset presets' };
      }
      // Clear caches, then re-fetch so shared state has fresh data before spinner dismisses
      invalidateUserCaches(userEmail);
      await refreshPresets(true);
      setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset account' };
    }
  }, [userEmail]);

  const handleDeleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        if (BlockingModule) await BlockingModule.forceUnlock();
      } catch (e) {}
      await ScheduleModule?.saveScheduledPresets('[]');
      const result = await deleteAccount(userEmail);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to delete account' };
      }
      // Clear all shared state and caches
      invalidateUserCaches(userEmail);
      setSharedPresets([]);
      setSharedPresetsLoaded(false);
      setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
      await AsyncStorage.clear();
      await clearAuthToken();
      setUserEmail('');
      setAuthState('auth');
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete account' };
    }
  }, [userEmail]);

  // Handle internet reconnection — clear all caches and re-initialize
  const handleReconnect = useCallback(async () => {
    clearAllCaches();
    if (userEmail) {
      invalidateUserCaches(userEmail);
    }
    setSharedPresets([]);
    setSharedPresetsLoaded(false);
    setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
    setTapoutStatus(null);
    setIsInitializing(true);
    await checkLoginStatus();
    setRefreshTrigger(prev => prev + 1);
  }, [userEmail, checkLoginStatus]);

  // Check if any scheduled preset is currently active
  const checkActiveScheduledPreset = useCallback(async () => {
    if (!userEmail || authState !== 'main') return;

    try {
      const presets = await refreshPresets();

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
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'batteryOptimization', 'deviceAdmin'];
        const missingPermission = requiredPermissions.some((perm: string) => !states[perm]);

        if (missingPermission) {
          setAuthState('permissions');
        }
      }
    } catch (error) {
      // Failed to check permissions
    }
  }, [userEmail, authState]);

  // Check membership when app comes to foreground
  const checkMembershipOnForeground = useCallback(async () => {
    if (!userEmail || authState !== 'main') return;

    try {
      const membership = await getMembershipStatus(userEmail, true);
      if (membership.trialExpired && !membership.isMember) {
        try {
          if (BlockingModule) await BlockingModule.forceUnlock();
          await ScheduleModule?.saveScheduledPresets('[]');
          invalidateUserCaches(userEmail);
        } catch (e) {
          // Best effort cleanup
        }
        setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
        setSharedPresets(prev => prev.map(p => ({ ...p, isActive: false })));
        setAuthState('membership');
      }
    } catch (error) {
      // Failed to check membership
    }
  }, [userEmail, authState]);

  // Initial check — also clear caches on fresh app launch
  useEffect(() => {
    if (isFirstLoad()) {
      clearAllCaches();
      markInitialLoadComplete();
    }
    checkLoginStatus();
    checkScheduledPresetLaunch();
    checkBlockedOverlayLaunch();
  }, []);

  // Schedule exact trial expiry timer so membership screen shows instantly when trial ends
  useEffect(() => {
    console.log(`[TRIAL-TIMER] useEffect fired — userEmail=${userEmail}, authState=${authState}`);
    if (!userEmail || authState !== 'main') {
      console.log('[TRIAL-TIMER] Skipping — no email or not in main state');
      return;
    }

    let expiryTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleExpiryTimer = async () => {
      try {
        const membership = await getMembershipStatus(userEmail, true);
        console.log(`[TRIAL-TIMER] Membership data — isMember=${membership.isMember}, trialExpired=${membership.trialExpired}, trialEnd=${membership.trialEnd}`);

        if (membership.isMember || membership.trialExpired || !membership.trialEnd) {
          console.log('[TRIAL-TIMER] Skipping timer — already member, expired, or no trialEnd');
          return;
        }

        const msUntilExpiry = new Date(membership.trialEnd).getTime() - Date.now();
        console.log(`[TRIAL-TIMER] ms until expiry: ${msUntilExpiry} (${Math.round(msUntilExpiry / 1000)}s)`);

        if (msUntilExpiry <= 0) {
          console.log('[TRIAL-TIMER] Already expired — triggering immediately');
          try {
            if (BlockingModule) await BlockingModule.forceUnlock();
            await ScheduleModule?.saveScheduledPresets('[]');
            invalidateUserCaches(userEmail);
          } catch (e) {
            console.log('[TRIAL-TIMER] Error deactivating presets:', e);
          }
          setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
          setSharedPresets(prev => prev.map(p => ({ ...p, isActive: false })));
          setAuthState('membership');
          return;
        }

        console.log(`[TRIAL-TIMER] Scheduling setTimeout for ${Math.round(msUntilExpiry / 1000)}s from now`);
        expiryTimeout = setTimeout(async () => {
          console.log('[TRIAL-TIMER] ⏰ TIMER FIRED — trial expired, showing membership screen');
          try {
            if (BlockingModule) await BlockingModule.forceUnlock();
            await ScheduleModule?.saveScheduledPresets('[]');
            invalidateUserCaches(userEmail);
          } catch (e) {
            console.log('[TRIAL-TIMER] Error deactivating presets:', e);
          }
          setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
          setSharedPresets(prev => prev.map(p => ({ ...p, isActive: false })));
          setAuthState('membership');
        }, msUntilExpiry);
      } catch (error) {
        console.log('[TRIAL-TIMER] Error scheduling timer:', error);
      }
    };

    scheduleExpiryTimer();

    return () => {
      if (expiryTimeout) {
        console.log('[TRIAL-TIMER] Cleanup — clearing timeout');
        clearTimeout(expiryTimeout);
      }
    };
  }, [userEmail, authState]);

  // AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissionsOnForeground();
        checkMembershipOnForeground();
        checkScheduledPresetLaunch();
        checkBlockedOverlayLaunch();
        checkActiveScheduledPreset();
      }
    });

    return () => subscription.remove();
  }, [checkPermissionsOnForeground, checkMembershipOnForeground, checkScheduledPresetLaunch, checkBlockedOverlayLaunch, checkActiveScheduledPreset]);

  // Global expiration check - runs whenever sharedPresets changes AND sets a timer for next expiration
  // This ensures expired presets are marked inactive regardless of which screen is active
  // Handles both scheduled presets (scheduleEndDate) and dated presets (targetDate)
  useEffect(() => {
    if (!userEmail || authState !== 'main' || !sharedPresetsLoaded) return;

    const checkExpiration = () => {
      const now = new Date();
      const currentPresets = sharedPresetsRef.current;
      const expiredPresets = currentPresets.filter(p => {
        if (!p.isActive) return false;

        // Scheduled presets
        if (p.isScheduled && p.scheduleEndDate) {
          // Recurring presets with toggle ON never expire - they auto-reschedule
          if (p.repeat_enabled) return false;
          return new Date(p.scheduleEndDate) <= now;
        }

        // Non-scheduled presets with targetDate (dated presets)
        if (!p.isScheduled && p.targetDate && !p.noTimeLimit) {
          return new Date(p.targetDate) <= now;
        }

        return false;
      });

      if (expiredPresets.length > 0) {
        // Update sharedPresets to mark expired ones as inactive
        setSharedPresets(prev => prev.map(p =>
          expiredPresets.some(exp => exp.id === p.id) ? { ...p, isActive: false } : p
        ));
        // Invalidate cache so getPresets() returns fresh data
        invalidateUserCaches(userEmail);
        // Save to backend for each expired preset
        expiredPresets.forEach(p => {
          savePreset(userEmail, { ...p, isActive: false }).catch(() => {});
        });
      }
    };

    // Check immediately
    checkExpiration();

    // Find the next preset that will expire and set a timeout for it
    const now = new Date();
    const expirationTimes: number[] = [];

    sharedPresets.forEach(p => {
      if (!p.isActive) return;

      // Scheduled presets
      if (p.isScheduled && p.scheduleEndDate && !p.repeat_enabled) {
        const time = new Date(p.scheduleEndDate).getTime();
        if (time > now.getTime()) expirationTimes.push(time);
      }

      // Non-scheduled presets with targetDate
      if (!p.isScheduled && p.targetDate && !p.noTimeLimit) {
        const time = new Date(p.targetDate).getTime();
        if (time > now.getTime()) expirationTimes.push(time);
      }
    });

    const nextExpiration = expirationTimes.sort((a, b) => a - b)[0];

    if (nextExpiration) {
      const timeUntilExpiration = nextExpiration - now.getTime() + 1000; // +1s buffer
      const timeout = setTimeout(checkExpiration, timeUntilExpiration);
      return () => clearTimeout(timeout);
    }
  }, [sharedPresets, sharedPresetsLoaded, userEmail, authState]);

  // Session changed listener
  useEffect(() => {
    if (!userEmail || authState !== 'main') return;

    checkActiveScheduledPreset();

    const subscription = DeviceEventEmitter.addListener('onSessionChanged', async (event) => {
      const eventType = event?.type;
      console.log('[UNLOCK-DEBUG] onSessionChanged event received:', eventType);

      // Optimistically update lock status IMMEDIATELY so UI reacts instantly
      if (eventType === 'session_started') {
        // Use lockEndsAt directly from the native event (ScheduledPresetReceiver sends it)
        const lockEndsAt = event?.lockEndsAt ?? null;
        console.log('[UNLOCK-DEBUG] session_started: setting lock with lockEndsAt:', lockEndsAt);
        setSharedLockStatus({
          isLocked: true,
          lockStartedAt: new Date().toISOString(),
          lockEndsAt,
        });
      } else if (eventType === 'session_ended') {
        setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
      }

      invalidateUserCaches(userEmail);

      // Fetch fresh presets and update shared state with accurate data from backend
      try {
        await refreshPresets(true);
      } catch (e) {
        // Will be refreshed via refreshTrigger below
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
    handleOnboardingComplete,
    handleOnboardingLoadingComplete,
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
    sharedLockStatus,
    setSharedLockStatus,
    sharedIsLocked: sharedLockStatus.isLocked,
    refreshPresets,
    refreshLockStatus,
    refreshTapoutStatus,
    refreshAll,
    handleReconnect,
    onboardingChoice,
    sharedStats,
    setSharedStats,
    prefetchStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
