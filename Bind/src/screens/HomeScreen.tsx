import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Text,
  View,
  NativeModules,
  TouchableOpacity,
  AppState,
  Vibration,
  ScrollView,
  Modal,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlockNowButton from '../components/BlockNowButton';
import InfoModal from '../components/InfoModal';
import EmergencyTapoutModal from '../components/EmergencyTapoutModal';
import { getPresets, getLockStatus, updateLockStatus, Preset, getEmergencyTapoutStatus, useEmergencyTapout, activatePreset, invalidateUserCaches, isFirstLoad, markInitialLoadComplete, clearAllCaches } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';


const { BlockingModule, PermissionsModule } = NativeModules;

// Clock icon for schedule badges
const ClockIcon = ({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z"
    />
  </Svg>
);

function HomeScreen() {
  const { userEmail: email, refreshTrigger, sharedPresets, setSharedPresets, sharedPresetsLoaded, setSharedPresetsLoaded, setSharedIsLocked, tapoutStatus, setTapoutStatus } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [scheduledPresets, setScheduledPresets] = useState<Preset[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockEndsAt, setLockEndsAt] = useState<string | null>(null);
  const [lockStartedAt, setLockStartedAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Emergency tapout state
  const [emergencyTapoutModalVisible, setEmergencyTapoutModalVisible] = useState(false);
  const [tapoutLoading, setTapoutLoading] = useState(false);

  // Scheduled presets expandable modal
  const [scheduledPresetsModalVisible, setScheduledPresetsModalVisible] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Prevent concurrent loadStats calls (race condition fix)
  const loadStatsInProgressRef = useRef(false);

  const showModal = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);

  // Track which scheduled preset we're currently activating to prevent duplicates
  const activatingPresetRef = useRef<string | null>(null);

  // Check and activate scheduled presets
  const checkScheduledPresets = useCallback(async (presets: Preset[], currentLockStatus: { isLocked: boolean; lockEndsAt: string | null }) => {
    const now = new Date();

    // Find scheduled presets that should be activated now
    for (const preset of presets) {
      if (preset.isScheduled && preset.isActive && preset.scheduleStartDate && preset.scheduleEndDate) {
        const startDate = new Date(preset.scheduleStartDate);
        const endDate = new Date(preset.scheduleEndDate);

        // Check if current time is within the schedule window
        if (now >= startDate && now < endDate) {
          // If already locked with a timed preset (not this scheduled one), check if we should override
          if (currentLockStatus.isLocked) {
            // If current lock has no end time (untimed), auto-cancel it for the scheduled preset
            if (!currentLockStatus.lockEndsAt) {
              // Check if we're already activating this preset
              if (activatingPresetRef.current === preset.id) {
                return null;
              }
              return { preset, shouldOverride: true };
            }
            // If current lock ends AFTER the scheduled preset starts, it might be a different session
            // Don't override if it's already a timed lock
            return null;
          }

          // Check if we're already activating this preset
          if (activatingPresetRef.current === preset.id) {
            return null;
          }

          return { preset, shouldOverride: false };
        }
      }
    }

    return null;
  }, []);

  // Activate a scheduled preset
  const activateScheduledPreset = useCallback(async (preset: Preset) => {
    // Set the ref to prevent duplicate activations
    activatingPresetRef.current = preset.id;

    try {
      // Activate the preset in database
      await activatePreset(email, preset.id);

      // Use scheduleEndDate as the lock end time
      const lockEndsAtDate = preset.scheduleEndDate;

      // Update lock status in database
      await updateLockStatus(email, true, lockEndsAtDate);

      setIsLocked(true);
      setSharedIsLocked(true);
      setLockEndsAt(lockEndsAtDate ?? null);
      setCurrentPreset(preset.name);
      setActivePreset(preset);

      // Call native blocking module
      if (BlockingModule) {
        await BlockingModule.startBlocking({
          mode: preset.mode,
          selectedApps: preset.selectedApps,
          blockedWebsites: preset.blockedWebsites,
          timerDays: 0,
          timerHours: 0,
          timerMinutes: 0,
          blockSettings: preset.blockSettings,
          noTimeLimit: false,
          presetName: preset.name,
          presetId: preset.id,
          isScheduled: true, // Scheduled preset - ScheduledPresetReceiver handles end notification
          strictMode: preset.strictMode ?? false,
        });
      }

      Vibration.vibrate([0, 100, 50, 100]);
    } catch (error) {
    } finally {
      // Clear the activating ref after a delay to allow for settling
      setTimeout(() => {
        activatingPresetRef.current = null;
      }, 2000);
    }
  }, [email]);

  const loadStats = useCallback(async (skipCache = false, showLoading = false) => {
    // Prevent concurrent calls (race condition fix)
    if (loadStatsInProgressRef.current) {
      return;
    }
    loadStatsInProgressRef.current = true;

    if (showLoading) setLoading(true);
    const hideLoading = () => {
      if (showLoading) setTimeout(() => setLoading(false), 100);
    };
    try {
      // Always fetch presets, lock status, and tapout status in parallel
      // loadStats needs consistent presets+lock data to determine correct state
      const [presets, lockStatus, tapout] = await Promise.all([
        getPresets(email, skipCache),
        getLockStatus(email, skipCache),
        getEmergencyTapoutStatus(email, skipCache),
      ]);

      // Update shared state immediately so other screens see fresh data
      // This must happen before any early returns below
      setSharedPresets(presets);
      setSharedPresetsLoaded(true);

      // Find active scheduled presets (sorted by start date) - only non-expired ones for the list
      const activeScheduled = presets
        .filter(p => p.isScheduled && p.isActive && p.scheduleEndDate)
        .filter(p => new Date(p.scheduleEndDate!) > new Date()) // Not expired
        .sort((a, b) => new Date(a.scheduleStartDate!).getTime() - new Date(b.scheduleStartDate!).getTime());

      // Check for scheduled presets that should activate
      const scheduledResult = await checkScheduledPresets(presets, lockStatus);
      if (scheduledResult) {
        const { preset, shouldOverride } = scheduledResult;

        // If we need to override an untimed lock, force unlock first
        if (shouldOverride) {
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
          }
          // Deactivate the no-time-limit preset in the backend
          await activatePreset(email, null);
          await updateLockStatus(email, false, null);
          invalidateUserCaches(email);
        }

        await activateScheduledPreset(preset);
        // Also set state that would normally be set
        setScheduledPresets(activeScheduled);
        setTapoutStatus(tapout);
        hideLoading();
        loadStatsInProgressRef.current = false;
        return; // State will be updated by activateScheduledPreset
      }

      setScheduledPresets(activeScheduled);

      // Find active non-scheduled preset
      const active = presets.find(p => p.isActive && !p.isScheduled);

      // Determine currently blocking preset
      const now = new Date();

      // AUTO-UNLOCK: If we're locked with a timer that has expired, auto-unlock
      // This handles the case when app was closed/killed while timer ran out
      if (lockStatus.isLocked && lockStatus.lockEndsAt) {
        const lockEndTime = new Date(lockStatus.lockEndsAt).getTime();
        if (lockEndTime <= now.getTime()) {
          // Lock has expired - auto-unlock but keep preset active
          try {
            await updateLockStatus(email, false, null);
            if (BlockingModule) {
              await BlockingModule.forceUnlock();
            }
            // NOTE: Don't deactivate the preset - keep it selected so user can lock again easily
            invalidateUserCaches(email);
            Vibration.vibrate(100);

            // Set unlocked state but keep the preset showing
            setIsLocked(false);
            setSharedIsLocked(false);
            setLockEndsAt(null);
            setLockStartedAt(null);
            // Keep preset active - set it from the active preset found
            if (active) {
              setCurrentPreset(active.name);
              setActivePreset(active);
            }
            setScheduledPresets(activeScheduled);
            setTapoutStatus(tapout);
            hideLoading();
            loadStatsInProgressRef.current = false;
            return; // Exit early, state is set
          } catch (error) {
            // Continue with normal flow if auto-unlock fails
          }
        }
      }

      // If we're locked, check if there's a scheduled preset that was blocking (even if expired)
      // This keeps the preset showing until user unlocks
      if (lockStatus.isLocked) {
        // First check for a currently active scheduled preset
        const currentlyBlockingScheduled = activeScheduled.find(p => {
          const start = new Date(p.scheduleStartDate!);
          const end = new Date(p.scheduleEndDate!);
          return now >= start && now < end;
        });

        if (currentlyBlockingScheduled) {
          // A scheduled preset is currently in its window and blocking
          setCurrentPreset(currentlyBlockingScheduled.name);
          setActivePreset(currentlyBlockingScheduled);
        } else if (active) {
          // Regular active preset is blocking (no-time-limit preset)
          setCurrentPreset(active.name);
          setActivePreset(active);
        } else {
          // Locked but no matching preset found (edge case)
          setCurrentPreset(null);
          setActivePreset(null);
        }
      } else {
        // Not locked - show the active preset if any
        if (active) {
          setCurrentPreset(active.name);
          setActivePreset(active);
        } else {
          setCurrentPreset(null);
          setActivePreset(null);
        }
      }

      setIsLocked(lockStatus.isLocked);
      setSharedIsLocked(lockStatus.isLocked);
      setLockEndsAt(lockStatus.lockEndsAt);
      setLockStartedAt(lockStatus.lockStartedAt);
      setTapoutStatus(tapout);
      hideLoading();
    } catch (error) {
      hideLoading();
    } finally {
      loadStatsInProgressRef.current = false;
    }
  }, [email, checkScheduledPresets, activateScheduledPreset, setSharedPresets, setSharedPresetsLoaded]);

  // Handle using emergency tapout
  const handleUseEmergencyTapout = useCallback(async () => {
    // Check if active preset allows emergency tapout (per-preset setting)
    if (!activePreset?.allowEmergencyTapout) {
      showModal('Not Available', 'Emergency tapout is not enabled for this preset.');
      setEmergencyTapoutModalVisible(false);
      return;
    }

    if ((tapoutStatus?.remaining ?? 0) <= 0) {
      showModal('No Tapouts Left', 'You have no emergency tapouts remaining.');
      setEmergencyTapoutModalVisible(false);
      return;
    }

    // Store preset info before starting
    const presetIdToKeep = activePreset?.id;
    const isScheduledPreset = activePreset?.isScheduled;

    setTapoutLoading(true);
    setLoading(true);
    try {
      // Tapout API must succeed before unlocking (decrements tapout count)
      const result = await useEmergencyTapout(email);
      if (result.success) {
        // 1) Optimistic local + shared state (instant UI)
        setEmergencyTapoutModalVisible(false);
        setIsLocked(false);
        setSharedIsLocked(false);
        setLockEndsAt(null);
        setLockStartedAt(null);
        setTapoutStatus(tapoutStatus ? { ...tapoutStatus, remaining: result.remaining } : null);
        if (isScheduledPreset) {
          setCurrentPreset(null);
          setActivePreset(null);
          if (presetIdToKeep) {
            setSharedPresets(prev => prev.map(p =>
              p.id === presetIdToKeep ? { ...p, isActive: false } : p
            ));
          }
        }

        // 2) Clear native blocking + minimum 200ms spinner for smooth feel
        const minSpinner = new Promise<void>(resolve => setTimeout(resolve, 200));
        if (BlockingModule) {
          await Promise.all([BlockingModule.forceUnlock(), minSpinner]);
        } else {
          await minSpinner;
        }

        Vibration.vibrate(100);
        setTapoutLoading(false);
        setLoading(false);

        // 3) Backend sync + data refresh (fire-and-forget)
        (async () => {
          try {
            await updateLockStatus(email, false, null);
            if (isScheduledPreset) {
              await activatePreset(email, null);
            } else if (presetIdToKeep) {
              await activatePreset(email, presetIdToKeep);
            }
            invalidateUserCaches(email);
            loadStats(true);
          } catch {
            // Backend sync failed silently — state will reconcile on next app foreground
          }
        })();
      } else {
        setTapoutLoading(false);
        setLoading(false);
        showModal('Failed', 'Could not use emergency tapout. Please try again.');
      }
    } catch (error) {
      setTapoutLoading(false);
      setLoading(false);
      showModal('Error', 'Something went wrong. Please try again.');
    }
  }, [email, tapoutStatus, activePreset, showModal, loadStats]);

  // Load data on mount
  useEffect(() => {
    async function init() {
      // On first app load (app was killed/restarted), clear all caches for fresh data
      // On subsequent navigations, only invalidate user-specific caches
      if (isFirstLoad()) {
        clearAllCaches();
        markInitialLoadComplete();
      } else {
        invalidateUserCaches(email);
      }
      await loadStats(true, true); // skipCache=true, showLoading=true
    }
    init();

    // Refresh preset when app comes to foreground (silently, no loading spinner)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        invalidateUserCaches(email);
        await loadStats(true, false); // skipCache=true, showLoading=false
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadStats, email]);

  // Reload when refreshTrigger changes (e.g., after scheduled preset from App.tsx)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // Close any open modals
      setEmergencyTapoutModalVisible(false);
      // Fetch fresh data with loading spinner
      invalidateUserCaches(email);
      loadStats(true, true); // skipCache=true, showLoading=true
    }
  }, [refreshTrigger, loadStats, email]);

  // React to shared preset changes from other screens (e.g., PresetsScreen toggling)
  // This updates derived state without a full loadStats call
  // Note: Expiration checking is handled globally in AuthContext
  useEffect(() => {
    if (!sharedPresetsLoaded || loading) return;

    // Update active non-scheduled preset
    const active = sharedPresets.find(p => p.isActive && !p.isScheduled);
    if (active) {
      setCurrentPreset(active.name);
      setActivePreset(active);
    } else if (!isLocked) {
      // Only clear if not locked (if locked, loadStats sets the correct preset)
      setCurrentPreset(null);
      setActivePreset(null);
    }

    // Update scheduled presets list
    const activeScheduled = sharedPresets
      .filter(p => p.isScheduled && p.isActive && p.scheduleEndDate)
      .filter(p => new Date(p.scheduleEndDate!) > new Date())
      .sort((a, b) => new Date(a.scheduleStartDate!).getTime() - new Date(b.scheduleStartDate!).getTime());
    setScheduledPresets(activeScheduled);
  }, [sharedPresets, sharedPresetsLoaded]);

  // Auto-unlock when timer expires (called from countdown effect)
  const handleTimerExpired = useCallback(async () => {
    try {
      // Update database lock status to unlocked
      await updateLockStatus(email, false, null);

      // Clear native blocking (native side should already be cleared by TimerPresetReceiver,
      // but call this to ensure sync)
      if (BlockingModule) {
        await BlockingModule.forceUnlock();
      }

      Vibration.vibrate(100);
      invalidateUserCaches(email);

      // Refresh to get updated state (same as app launch unlock)
      await loadStats(true, true); // skipCache=true, showLoading=true
    } catch (error) {
      // Failed to auto-unlock on timer expiry
    }
  }, [email, loadStats]);

  // Countdown timer effect (for timed locks)
  useEffect(() => {
    if (!isLocked || !lockEndsAt) {
      setTimeRemaining(null);
      return;
    }

    function updateCountdown() {
      const endTime = new Date(lockEndsAt!).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        // Auto-unlock when timer reaches 0
        handleTimerExpired();
        return;
      }

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isLocked, lockEndsAt, activePreset?.isScheduled, handleTimerExpired]);

  // Logo transition animation when lock state changes
  // Elapsed time effect (for no-time-limit locks)
  useEffect(() => {
    if (!isLocked || lockEndsAt || !lockStartedAt) {
      setElapsedTime(null);
      return;
    }

    function updateElapsed() {
      const startTime = new Date(lockStartedAt!).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - startTime);

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (days > 0) {
        setElapsedTime(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds}s`);
      } else {
        setElapsedTime(`${seconds}s`);
      }
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isLocked, lockEndsAt, lockStartedAt]);

  const formatScheduleDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  // Memoize scheduled presets status dot color
  const scheduledDotColor = useMemo(() => {
    if (scheduledPresets.length === 0) return colors.textSecondary;
    const now = new Date();
    const hasActive = scheduledPresets.some(p => {
      const start = new Date(p.scheduleStartDate!);
      const end = new Date(p.scheduleEndDate!);
      return now >= start && now < end;
    });
    if (hasActive) return '#22c55e';
    const hasPending = scheduledPresets.some(p => {
      const start = new Date(p.scheduleStartDate!);
      return now < start;
    });
    if (hasPending) return '#f59e0b';
    return colors.textSecondary;
  }, [scheduledPresets, colors.textSecondary]);

  // Memoize unlock press handler for timed presets (shows emergency tapout modal)
  const handleUnlockPress = useCallback(() => {
    // Timed preset - show emergency tapout modal
    setEmergencyTapoutModalVisible(true);
  }, []);

  // Handle slide to unlock (called directly from BlockNowButton)
  // For scheduled/recurring presets: call backend endpoint (same as emergency tapout but without decrementing tapout count)
  // For regular presets: just unlock but keep preset active
  const handleSlideUnlock = useCallback(async () => {
    // Store preset info before starting
    const presetIdToKeep = activePreset?.id;
    const isScheduledPreset = activePreset?.isScheduled;

    try {
      setLoading(true);

      // 1) Optimistic local + shared state (instant UI)
      setIsLocked(false);
      setSharedIsLocked(false);
      setLockEndsAt(null);
      setLockStartedAt(null);
      if (isScheduledPreset) {
        setCurrentPreset(null);
        setActivePreset(null);
        if (presetIdToKeep) {
          setSharedPresets(prev => prev.map(p =>
            p.id === presetIdToKeep ? { ...p, isActive: false } : p
          ));
        }
      }

      // 2) Clear native blocking + minimum 200ms spinner for smooth feel
      const minSpinner = new Promise<void>(resolve => setTimeout(resolve, 200));
      if (BlockingModule) {
        await Promise.all([BlockingModule.forceUnlock(), minSpinner]);
      } else {
        await minSpinner;
      }

      Vibration.vibrate(100);
      setLoading(false);

      // 3) Backend sync + data refresh (fire-and-forget)
      (async () => {
        try {
          if (isScheduledPreset) {
            await useEmergencyTapout(email, presetIdToKeep, true);
          } else {
            await updateLockStatus(email, false, null);
            if (presetIdToKeep) {
              await activatePreset(email, presetIdToKeep);
            }
          }
          invalidateUserCaches(email);
          loadStats(true);
        } catch {
          // Backend sync failed silently — state will reconcile on next app foreground
        }
      })();

    } catch (error) {
      setLoading(false);
      showModal('Error', 'Failed to unlock. Please try again.');
    }
  }, [email, loadStats, showModal, activePreset]);

  const handleBlockNow = useCallback(async () => {
    try {
      if (!activePreset) {
        showModal(
          'No Preset Selected',
          'Please toggle a preset in the Presets tab before you can start blocking.'
        );
        return;
      }

      // Check permissions before starting blocking (platform-specific)
      if (PermissionsModule) {
        try {
          if (Platform.OS === 'ios') {
            // iOS: Check Screen Time authorization
            const isScreenTimeAuthorized = await PermissionsModule.isScreenTimeAuthorized();
            if (!isScreenTimeAuthorized) {
              showModal(
                'Permission Required',
                'Screen Time access is not enabled. Please enable it to block apps.'
              );
              return;
            }
          } else {
            // Android: Check Accessibility Service
            const isAccessibilityEnabled = await PermissionsModule.isAccessibilityServiceEnabled();
            if (!isAccessibilityEnabled) {
              showModal(
                'Permission Required',
                'Accessibility Service is not enabled. Please enable it in Settings to block apps.'
              );
              return;
            }
          }
        } catch (permError) {
          // Continue anyway if we can't check - native module might still work
        }
      }

      // Show loading spinner immediately
      setLoading(true);

      // Calculate lock end time based on preset type
      let calculatedLockEndsAt: string | null = null;
      const now = new Date();

      // For non-scheduled presets, check if they would overlap with any active scheduled preset
      if (!activePreset.isScheduled && scheduledPresets.length > 0) {
        // Calculate when this block would end
        let blockEndTime: Date | null = null;

        if (activePreset.noTimeLimit) {
          // No time limit - allow activation; if a scheduled preset kicks in later,
          // checkScheduledPresets will auto-deactivate this preset
        } else if (activePreset.targetDate) {
          blockEndTime = new Date(activePreset.targetDate);
        } else {
          const durationMs =
            (activePreset.timerDays * 24 * 60 * 60 * 1000) +
            (activePreset.timerHours * 60 * 60 * 1000) +
            (activePreset.timerMinutes * 60 * 1000) +
            ((activePreset.timerSeconds ?? 0) * 1000);
          blockEndTime = new Date(now.getTime() + durationMs);
        }

        // Check for overlap with each scheduled preset
        if (blockEndTime) {
          for (const scheduled of scheduledPresets) {
            const schedStart = new Date(scheduled.scheduleStartDate!);
            const schedEnd = new Date(scheduled.scheduleEndDate!);

            // Check if ranges overlap: block starts before schedule ends AND block ends after schedule starts
            if (now < schedEnd && blockEndTime > schedStart) {
              setLoading(false);
              showModal(
                'Schedule Conflict',
                `This would overlap with "${scheduled.name}" (${formatScheduleDate(scheduled.scheduleStartDate!)} - ${formatScheduleDate(scheduled.scheduleEndDate!)}). Please adjust your preset duration or disable the scheduled preset.`
              );
              return;
            }
          }
        }
      }

      if (activePreset.isScheduled && activePreset.scheduleStartDate && activePreset.scheduleEndDate) {
        // Scheduled preset - check if we're within the schedule window
        const startDate = new Date(activePreset.scheduleStartDate);
        const endDate = new Date(activePreset.scheduleEndDate);

        if (now < startDate) {
          setLoading(false);
          const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          showModal('Not Yet', `"${activePreset.name}" is scheduled to start on ${dateStr} at ${timeStr}.`);
          return;
        }

        if (now >= endDate) {
          setLoading(false);
          showModal('Schedule Ended', 'This scheduled preset has already ended.');
          return;
        }

        // Use scheduleEndDate as lock end time
        calculatedLockEndsAt = activePreset.scheduleEndDate;
      } else if (!activePreset.noTimeLimit) {
        // Non-scheduled preset with time limit
        if (activePreset.targetDate) {
          // Target date set - use it directly
          calculatedLockEndsAt = activePreset.targetDate;
        } else {
          // Calculate from timer values
          const now = new Date();
          const durationMs =
            (activePreset.timerDays * 24 * 60 * 60 * 1000) +
            (activePreset.timerHours * 60 * 60 * 1000) +
            (activePreset.timerMinutes * 60 * 1000) +
            ((activePreset.timerSeconds ?? 0) * 1000);
          calculatedLockEndsAt = new Date(now.getTime() + durationMs).toISOString();
        }
      }
      // If noTimeLimit is true and not scheduled, calculatedLockEndsAt stays null

      // Update lock status in database
      await updateLockStatus(email, true, calculatedLockEndsAt);

      // Set local state immediately for instant UI update
      const nowISO = new Date().toISOString();
      setIsLocked(true);
      setSharedIsLocked(true);
      setLockEndsAt(calculatedLockEndsAt);
      setLockStartedAt(nowISO);

      // Call native blocking module
      if (BlockingModule) {

        // Calculate lock end time in milliseconds for native alarm scheduling
        const lockEndTimeMs = calculatedLockEndsAt
          ? new Date(calculatedLockEndsAt).getTime()
          : 0;

        await BlockingModule.startBlocking({
          mode: activePreset.mode,
          selectedApps: activePreset.selectedApps,
          blockedWebsites: activePreset.blockedWebsites,
          timerDays: activePreset.timerDays,
          timerHours: activePreset.timerHours,
          timerMinutes: activePreset.timerMinutes,
          lockEndTimeMs: lockEndTimeMs, // Pass exact end time for native alarm scheduling
          blockSettings: activePreset.blockSettings,
          noTimeLimit: activePreset.noTimeLimit && !activePreset.isScheduled,
          presetName: activePreset.name,
          presetId: activePreset.id,
          isScheduled: activePreset.isScheduled || false, // Timer presets get timer alarm, scheduled presets don't
          strictMode: activePreset.strictMode ?? false,
        });

        Vibration.vibrate(50);
      } else {
        Vibration.vibrate(50);
      }

      // Local state already set above - no need to call loadStats which would cause a delay
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showModal('Error', 'Failed to start blocking session.');
    }
  }, [activePreset, email, showModal, scheduledPresets, formatScheduleDate, loadStats]);

  // Helper to get active settings display
  const getActiveSettingsDisplay = useCallback(() => {
    if (!activePreset) return [];
    const settings: string[] = [];

    if (activePreset.mode === 'all') {
      settings.push('All Apps');
    } else if (activePreset.selectedApps.length > 0) {
      settings.push(`${activePreset.selectedApps.length} App${activePreset.selectedApps.length !== 1 ? 's' : ''}`);
    }

    if (activePreset.blockedWebsites && activePreset.blockedWebsites.length > 0) {
      settings.push(`${activePreset.blockedWebsites.length} Website${activePreset.blockedWebsites.length !== 1 ? 's' : ''}`);
    }

    if (activePreset.isScheduled) {
      settings.push('Scheduled');
    }

    if (activePreset.repeat_enabled && activePreset.repeat_interval && activePreset.repeat_unit) {
      const unit = activePreset.repeat_interval === 1 ? activePreset.repeat_unit.replace(/s$/, '') : activePreset.repeat_unit;
      settings.push(`Recurs every ${activePreset.repeat_interval} ${unit}`);
    }

    if (activePreset.blockSettings) {
      settings.push('Blocking Settings');
    }

    if (activePreset.strictMode) {
      settings.push('Strict Mode');
    }

    if (activePreset.allowEmergencyTapout && activePreset.strictMode && !activePreset.noTimeLimit) {
      settings.push('Emergency Tapout');
    }

    return settings;
  }, [activePreset]);

  // Get preset timing subtext (for timed and dated presets, not scheduled)
  const getPresetTimingSubtext = useCallback((): string | null => {
    if (!activePreset || activePreset.isScheduled) return null;

    // For dated presets (targetDate is set)
    if (activePreset.targetDate) {
      const targetDate = new Date(activePreset.targetDate);
      const dateStr = targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
      const timeStr = targetDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Ends ${dateStr} at ${timeStr}`;
    }

    // For timed presets (has duration set, not no time limit)
    if (!activePreset.noTimeLimit) {
      const { timerDays, timerHours, timerMinutes, timerSeconds } = activePreset;
      const parts: string[] = [];
      if (timerDays > 0) parts.push(`${timerDays}d`);
      if (timerHours > 0) parts.push(`${timerHours}h`);
      if (timerMinutes > 0) parts.push(`${timerMinutes}m`);
      if (timerSeconds > 0 && parts.length === 0) parts.push(`${timerSeconds}s`);

      if (parts.length > 0) {
        return parts.join(' ');
      }
    }

    return null;
  }, [activePreset]);

  // Memoized JSX for active settings display (avoids IIFE in render)
  const activeSettingsDisplay = useMemo(() => {
    const settings = getActiveSettingsDisplay();
    return activePreset && settings.length > 0 ? (
      <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} mt-2 text-center px-4`}>
        Blocking {settings.join(', ')}
      </Text>
    ) : null;
  }, [getActiveSettingsDisplay, activePreset, colors.textSecondary]);

  // Memoized JSX for preset timing subtext (avoids IIFE in render)
  const presetTimingSubtext = useMemo(() => {
    const subtext = getPresetTimingSubtext();
    return subtext ? (
      <Text
        style={{ color: colors.textMuted }}
        className={`${textSize.small} ${fontFamily.regular} mt-1 text-center`}
      >
        {subtext}
      </Text>
    ) : null;
  }, [getPresetTimingSubtext, colors.textMuted]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateUserCaches(email);
    await loadStats(true, false);
    setRefreshing(false);
  }, [email, loadStats]);

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
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>scute</Text>
    
        </View>

        {/* Right side buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
          {/* WiFi Settings */}
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={() => { Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => {}); }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, ...shadow.card,
            }}
            className={`w-11 h-11 ${radius.full} items-center justify-center`}
          >
            <Svg width={s(18)} height={s(18)} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M12 20h.01" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>

          {/* Support @ icon */}
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={() => { Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request'); }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, ...shadow.card,
            }}
            className={`w-11 h-11 ${radius.full} items-center justify-center`}
          >
            <Svg width={s(18)} height={s(18)} viewBox="0 0 24 24" fill="none">
              <Path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M16 8v5a3 3 0 0 0 6 0V12a10 10 0 1 0-3.92 7.94" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Status + Preset + Scheduled - centered in full screen */}
        <View className="flex-1 items-center justify-center">
          {/* Status section */}
          <View className="items-center justify-center mb-4">
            {isLocked && timeRemaining ? (
              <>
                <Text style={{ color: colors.textMuted }} className={`${textSize.small} ${fontFamily.regular} mb-1`}>
                  Will unlock in
                </Text>
                <Text style={{ color: colors.text }} className={`${textSize['4xLarge']} ${fontFamily.bold} tracking-tight`}>
                  {timeRemaining}
                </Text>
              </>
            ) : isLocked && elapsedTime ? (
              <>
                <Text style={{ color: colors.textMuted }} className={`${textSize.small} ${fontFamily.regular}`}>
                  Locked for
                </Text>
                <Text style={{ color: colors.text }} className={`${textSize['4xLarge']} ${fontFamily.bold} tracking-tight mt-2`}>
                  {elapsedTime}
                </Text>
              </>
            ) : isLocked ? (
              <>
                <Text style={{ color: colors.text }} className={`${textSize['4xLarge']} ${fontFamily.bold} mb-1`}>
                  Locked
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.text }} className={`${textSize['4xLarge']} ${fontFamily.bold}`}>
                Not Locked
              </Text>
            )}
          </View>

          {/* Preset info - relative container for absolute scheduled button */}
          <View className="items-center" style={{ position: 'relative' }}>
            <View className="items-center justify-center">
              <Text
                style={{ color: colors.text }}
                className={`${textSize.large} ${fontFamily.semibold} text-center`}
              >
                Preset: {currentPreset || 'None Selected'}
              </Text>
            </View>

            {/* Active settings display */}
            {activeSettingsDisplay}

            {/* Preset timing subtext (for timed/dated presets) */}
            {presetTimingSubtext}

            {/* Scheduled Presets Button - absolutely positioned under preset text */}
            {scheduledPresets.length > 0 && (
              <TouchableOpacity
                onPressIn={lightTap}
                onPress={() => { setScheduledPresetsModalVisible(true); }}
                activeOpacity={0.7}
                className={`px-5 py-2.5 ${radius.full} flex-row items-center`}
                style={{
                  backgroundColor: colors.card,
                  position: 'absolute',
                  top: '100%',
                  marginTop: s(24),
                  borderWidth: 1, borderColor: colors.border, ...shadow.card,
                }}
              >
                {/* Status clock icon */}
                <View style={{ marginRight: s(8) }}>
                  <ClockIcon size={s(14)} color={scheduledDotColor} />
                </View>
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  {scheduledPresets.length} Scheduled
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Button - clean matte style */}
        <View className="mb-10">
          <BlockNowButton
            onActivate={handleBlockNow}
            onUnlockPress={handleUnlockPress}
            onSlideUnlock={handleSlideUnlock}
            disabled={!currentPreset}
            isLocked={isLocked}
            hasActiveTimer={!!timeRemaining}
            strictMode={activePreset?.strictMode ?? false}
          />
        </View>
      </ScrollView>


      {/* Info Modal */}
      <InfoModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />

      {/* Emergency Tapout Modal */}
      <EmergencyTapoutModal
        visible={emergencyTapoutModalVisible}
        onClose={() => setEmergencyTapoutModalVisible(false)}
        onUseTapout={handleUseEmergencyTapout}
        presetAllowsTapout={!!activePreset?.allowEmergencyTapout}
        tapoutsRemaining={tapoutStatus?.remaining ?? 0}
        isLoading={tapoutLoading}
        lockEndsAt={lockEndsAt}
      />

      {/* Scheduled Presets Modal */}
      <Modal
        visible={scheduledPresetsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduledPresetsModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              ...shadow.modal,
            }}
            className={`w-full ${radius['2xl']} overflow-hidden max-h-[70%]`}
          >
            {/* Header */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }} className="p-4">
              <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold} text-center`}>
                Scheduled Presets
              </Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mt-1`}>
                {scheduledPresets.length} preset{scheduledPresets.length !== 1 ? 's' : ''} scheduled
              </Text>
            </View>

            {/* Scrollable List */}
            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              {scheduledPresets.map((preset, index) => {
                const now = new Date();
                const start = new Date(preset.scheduleStartDate!);
                const end = new Date(preset.scheduleEndDate!);
                const isCurrentlyActive = now >= start && now < end;

                return (
                  <View
                    key={preset.id}
                    style={{ borderBottomWidth: index < scheduledPresets.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}
                    className="p-4 items-center"
                  >
                    <View className="flex-row items-start">
                      <View style={{ marginTop: s(3), marginRight: s(10) }}>
                        <ClockIcon size={14} color={isCurrentlyActive ? colors.green : colors.yellow} />
                      </View>
                      <View>
                        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
                          {preset.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                          {formatScheduleDate(preset.scheduleStartDate!)} - {formatScheduleDate(preset.scheduleEndDate!)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Close Button */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <TouchableOpacity
                onPressIn={lightTap}
                onPress={() => { setScheduledPresetsModalVisible(false); }}
                activeOpacity={0.7}
                className="py-4 items-center"
              >
                <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default memo(HomeScreen);
