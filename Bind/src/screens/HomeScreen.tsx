import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Text,
  View,
  NativeModules,
  TouchableOpacity,
  AppState,
  ScrollView,
  Modal,
  Platform,
  Linking,
  RefreshControl,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlockNowButton from '../components/BlockNowButton';
import InfoModal from '../components/InfoModal';
import EmergencyTapoutModal from '../components/EmergencyTapoutModal';
import { updateLockStatus, Preset, useEmergencyTapout, activatePreset, invalidateUserCaches } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';


const { BlockingModule, PermissionsModule } = NativeModules;

// Clock icon for schedule badges (using MaterialCommunityIcons)
const ClockIcon = ({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <MaterialCommunityIcons name="clock" size={size} color={color} />
);


function HomeScreen() {
  const { userEmail: email, refreshTrigger, sharedPresets, setSharedPresets, sharedPresetsLoaded, sharedLockStatus, setSharedLockStatus, tapoutStatus, setTapoutStatus, refreshAll } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [scheduledPresets, setScheduledPresets] = useState<Preset[]>([]);
  // Derived from shared lock status (single source of truth in AuthContext)
  const isLocked = sharedLockStatus.isLocked;
  const lockEndsAt = sharedLockStatus.lockEndsAt;
  const lockStartedAt = sharedLockStatus.lockStartedAt;
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

  // Silent notifications toggle
  const [silentNotifications, setSilentNotifications] = useState(false);


  // Lottie lock animation ref
  const lockLottieRef = useRef<any>(null);
  const lockLottieOpacity = useRef(new Animated.Value(0)).current;
  const isInitialMountRef = useRef(true);
  const prevIsLockedRef = useRef(isLocked);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [buttonInteracting, setButtonInteracting] = useState(false);
  const buttonAreaRef = useRef<View>(null);


  const showModal = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);

  const toggleSilentNotifications = useCallback(async () => {
    if (!BlockingModule?.setSilentNotifications) return;
    const newValue = !silentNotifications;
    setSilentNotifications(newValue);
    try {
      await BlockingModule.setSilentNotifications(newValue);
    } catch {}
  }, [silentNotifications]);

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

      setSharedLockStatus({ isLocked: true, lockStartedAt: new Date().toISOString(), lockEndsAt: lockEndsAtDate ?? null });
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


    } catch (error) {
    } finally {
      // Clear the activating ref after a delay to allow for settling
      setTimeout(() => {
        activatingPresetRef.current = null;
      }, 2000);
    }
  }, [email]);

  const loadStats = useCallback(async (skipCache = false, showLoading = false) => {
    if (showLoading) setLoading(true);
    const hideLoading = () => {
      if (showLoading) setTimeout(() => setLoading(false), 100);
    };
    try {
      // Fetch all data via AuthContext (single source of truth)
      const { presets, lockStatus, tapoutStatus: tapout } = await refreshAll(skipCache);

      // Find active scheduled presets (sorted by start date) - only non-expired ones for the list
      const activeScheduled = presets
        .filter((p: Preset) => p.isScheduled && p.isActive && p.scheduleEndDate)
        .filter((p: Preset) => new Date(p.scheduleEndDate!) > new Date()) // Not expired
        .sort((a: Preset, b: Preset) => new Date(a.scheduleStartDate!).getTime() - new Date(b.scheduleStartDate!).getTime());

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
        return; // State will be updated by activateScheduledPreset
      }

      setScheduledPresets(activeScheduled);

      // Find active non-scheduled preset
      const active = presets.find((p: Preset) => p.isActive && !p.isScheduled);

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

            // Set unlocked state but keep the preset showing
            setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
            // Keep preset active - set it from the active preset found
            if (active) {
              setCurrentPreset(active.name);
              setActivePreset(active);
            }
            setScheduledPresets(activeScheduled);
            setTapoutStatus(tapout);
            hideLoading();
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
        const currentlyBlockingScheduled = activeScheduled.find((p: Preset) => {
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

      // Sync lock status to shared state (refreshAll already set it, but ensure consistency after early returns)
      setSharedLockStatus(lockStatus);
      setTapoutStatus(tapout);
      hideLoading();
    } catch (error) {
      hideLoading();
    }
  }, [email, checkScheduledPresets, activateScheduledPreset, refreshAll]);

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
        // Unlock UI — clear timer in same render for smooth transition
        setEmergencyTapoutModalVisible(false);
        setTapoutLoading(false);
        setLoading(false);
        setTimeRemaining(null);
        setElapsedTime(null);
        setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
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

        // Fire-and-forget: native unlock + backend sync
        (async () => {
          try {
            if (BlockingModule) {
              await BlockingModule.forceUnlock();
            }
            await updateLockStatus(email, false, null);
            if (isScheduledPreset) {
              await activatePreset(email, null);
            } else if (presetIdToKeep) {
              await activatePreset(email, presetIdToKeep);
            }
            invalidateUserCaches(email);
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
  }, [email, tapoutStatus, activePreset, showModal]);

  // Load data on mount
  useEffect(() => {
    async function init() {
      // First-load cache clearing is now handled in AuthContext
      invalidateUserCaches(email);
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

  // Load silent notifications preference on mount
  useEffect(() => {
    if (BlockingModule?.getSilentNotifications) {
      BlockingModule.getSilentNotifications().then((silent: boolean) => {
        setSilentNotifications(silent);
      }).catch(() => {});
    }
  }, []);

  // Reload when refreshTrigger changes (e.g., after session ended from native)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // Close any open modals
      setEmergencyTapoutModalVisible(false);
      // Fetch fresh data silently (no spinner — AuthContext already refreshed presets)
      invalidateUserCaches(email);
      loadStats(true, false); // skipCache=true, showLoading=false
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
      // Optimistic UI update — instant unlock, clear timer in same render
      setTimeRemaining(null);
      setElapsedTime(null);
      setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });

      // Fire-and-forget: native unlock + backend sync
      (async () => {
        try {
          await updateLockStatus(email, false, null);
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
          }
          invalidateUserCaches(email);
        } catch {
          // Failed to sync — state will reconcile on next app foreground
        }
      })();
    } catch (error) {
      // Failed to auto-unlock on timer expiry
    }
  }, [email]);

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

  // Sync Lottie lock animation with lock state (fade in, play, fade out)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (isLocked) {
        lockLottieRef.current?.play(50, 50);
      }
      prevIsLockedRef.current = isLocked;
      return;
    }
    if (prevIsLockedRef.current !== isLocked) {
      const animDuration = isLocked ? 600 : 400;

      lockLottieRef.current?.play(isLocked ? 45 : 105, isLocked ? 63 : 117);

      // Fully native-driven: instant show → hold → fade out
      const anim = Animated.sequence([
        Animated.timing(lockLottieOpacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.delay(animDuration),
        Animated.timing(lockLottieOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]);
      anim.start();

      prevIsLockedRef.current = isLocked;
      return () => anim.stop();
    }
  }, [isLocked, lockLottieOpacity]);

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
    if (hasActive) return colors.green;
    const hasPending = scheduledPresets.some(p => {
      const start = new Date(p.scheduleStartDate!);
      return now < start;
    });
    if (hasPending) return colors.yellow;
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
      // Optimistic UI update — instant unlock, clear timer in same render
      setTimeRemaining(null);
      setElapsedTime(null);
      setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
      if (isScheduledPreset) {
        setCurrentPreset(null);
        setActivePreset(null);
        if (presetIdToKeep) {
          setSharedPresets(prev => prev.map(p =>
            p.id === presetIdToKeep ? { ...p, isActive: false } : p
          ));
        }
      }

      // Fire-and-forget: native unlock + backend sync
      (async () => {
        try {
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
          }
          if (isScheduledPreset) {
            await useEmergencyTapout(email, presetIdToKeep, true);
          } else {
            await updateLockStatus(email, false, null);
            if (presetIdToKeep) {
              await activatePreset(email, presetIdToKeep);
            }
          }
          invalidateUserCaches(email);
        } catch {
          // Backend sync failed silently — state will reconcile on next app foreground
        }
      })();

    } catch (error) {
      showModal('Error', 'Failed to unlock. Please try again.');
    }
  }, [email, showModal, activePreset]);

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
          const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          showModal('Not Yet', `"${activePreset.name}" is scheduled to start on ${dateStr} at ${timeStr}.`);
          return;
        }

        if (now >= endDate) {
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

      // Optimistic UI update — instant lock state + initial timer value
      // Set timeRemaining/elapsedTime in the same render to avoid a frame of just "Locked"
      const nowISO = new Date().toISOString();
      if (calculatedLockEndsAt) {
        const diff = new Date(calculatedLockEndsAt).getTime() - Date.now();
        if (diff > 0) {
          const d = Math.floor(diff / (24*60*60*1000));
          const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
          const m = Math.floor((diff % (60*60*1000)) / (60*1000));
          const sec = Math.floor((diff % (60*1000)) / 1000);
          setTimeRemaining(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`);
        }
      } else {
        setElapsedTime('0s');
      }
      setSharedLockStatus({ isLocked: true, lockStartedAt: nowISO, lockEndsAt: calculatedLockEndsAt });

      // Fire-and-forget: backend + native blocking
      (async () => {
        try {
          await updateLockStatus(email, true, calculatedLockEndsAt);

          if (BlockingModule) {
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
              lockEndTimeMs: lockEndTimeMs,
              blockSettings: activePreset.blockSettings,
              noTimeLimit: activePreset.noTimeLimit && !activePreset.isScheduled,
              presetName: activePreset.name,
              presetId: activePreset.id,
              isScheduled: activePreset.isScheduled || false,
              strictMode: activePreset.strictMode ?? false,
            });
          }

          invalidateUserCaches(email);
        } catch {
          // Backend/native sync failed — state will reconcile on next app foreground
        }
      })();

    } catch (error) {
      showModal('Error', 'Failed to start blocking session.');
    }
  }, [activePreset, email, showModal, scheduledPresets, formatScheduleDate, loadStats]);

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
      if (timerSeconds > 0) parts.push(`${timerSeconds}s`);

      if (parts.length > 0) {
        return parts.join(' ');
      }
    }

    if (activePreset.noTimeLimit) {
      return 'No Time Limit';
    }

    return null;
  }, [activePreset]);

  // Memoized JSX for preset timing subtext (avoids IIFE in render)
  const presetTimingSubtext = useMemo(() => {
    const subtext = getPresetTimingSubtext();
    return subtext ? (
      <Text
        style={{ color: colors.textMuted }}
        className={`${textSize.extraSmall} ${fontFamily.regular} mt-1 text-center`}
      >
        {subtext}
      </Text>
    ) : null;
  }, [getPresetTimingSubtext, colors.textMuted]);

  const refreshEnabled = !buttonInteracting;

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (!refreshEnabled) return;
    setRefreshing(true);
    invalidateUserCaches(email);
    await loadStats(true, false);
    setRefreshing(false);
  }, [email, loadStats, refreshEnabled]);

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
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>scute</Text>
    
        </View>

        {/* Right side buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
          {/* Silent Notifications Toggle */}
          <TouchableOpacity
            onPress={toggleSilentNotifications}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              backgroundColor: silentNotifications ? colors.green : colors.card,
              borderWidth: 1, borderColor: silentNotifications ? colors.green : colors.border, ...shadow.card,
              width: s(44), height: s(44), borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
            }}
          >
            {silentNotifications ? (
              <Svg width={s(18)} height={s(18)} viewBox="0 0 24 24" fill="#FFFFFF">
                <Path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM20.57 16.476c-.223.082-.448.161-.674.238L7.319 4.137A6.75 6.75 0 0 1 18.75 9v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206Z" />
                <Path fillRule="evenodd" clipRule="evenodd" d="M5.25 9c0-.184.007-.366.022-.546l10.384 10.384a3.751 3.751 0 0 1-7.396-1.119 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" />
              </Svg>
            ) : (
              <Svg width={s(18)} height={s(18)} viewBox="0 0 24 24" fill="#FFFFFF">
                <Path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
                <Path fillRule="evenodd" clipRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" />
              </Svg>
            )}
          </TouchableOpacity>

          {/* WiFi Settings */}
          <TouchableOpacity
            onPress={() => { Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => {}); }}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, ...shadow.card,
              width: s(44), height: s(44), borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
            }}
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
            onPress={() => { Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request'); }}
            activeOpacity={0.7}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, ...shadow.card,
              width: s(44), height: s(44), borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
            }}
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
            enabled={refreshEnabled}
            tintColor={colors.text}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
            progressViewOffset={-20}
          />
        }
      >
        {/* Status + Preset + Scheduled - centered in full screen */}
        <View className="flex-1 items-center justify-center">
          {/* Status section - fixed height to prevent layout shift between states */}
          <View className="items-center justify-center mb-2">
            <Text
              style={{ color: isLocked && (timeRemaining || elapsedTime) ? colors.textMuted : 'transparent' }}
              className={`${textSize.small} ${fontFamily.regular} mb-1`}
            >
              {isLocked && timeRemaining ? 'Will unlock in' : isLocked && elapsedTime ? 'Locked for' : ' '}
            </Text>
            <Text style={{ color: colors.text, fontSize: s(28) }} className={`${fontFamily.bold} tracking-tight`}>
              {isLocked && timeRemaining ? timeRemaining : isLocked && elapsedTime ? elapsedTime : isLocked ? 'Locked' : 'Not Locked'}
            </Text>
          </View>

          {/* Preset info - relative container for absolute scheduled button */}
          <View className="items-center" style={{ position: 'relative' }}>
            <Text
              style={{ color: colors.text }}
              className={`${textSize.large} ${fontFamily.semibold} text-center`}
            >
              Preset: {currentPreset || 'None Selected'}
            </Text>

            {/* Preset timing subtext (for timed/dated presets) */}
            {presetTimingSubtext}

            {/* Scheduled Presets Button - absolutely positioned under preset text */}
            {scheduledPresets.length > 0 && (
              <TouchableOpacity
                onPress={() => { setScheduledPresetsModalVisible(true); }}
                activeOpacity={0.7}
                className={`px-5 py-2.5 ${radius.full} flex-row items-center`}
                style={{
                  backgroundColor: colors.card,
                  position: 'absolute',
                  top: '100%',
                  marginTop: s(16),
                  borderWidth: 1, borderColor: colors.border, ...shadow.card,
                }}
              >
                {/* Status clock icon */}
                <View style={{ marginRight: s(8) }}>
                  <ClockIcon size={s(14)} color={scheduledDotColor} />
                </View>
                <Text style={{ color: colors.text }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                  {scheduledPresets.length} Scheduled
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Button - clean matte style */}
        <View
          ref={buttonAreaRef}
          className="mb-10"
          style={{ position: 'relative' }}
          onTouchStart={() => setButtonInteracting(true)}
          onTouchEnd={() => setButtonInteracting(false)}
          onTouchCancel={() => setButtonInteracting(false)}
        >
          {/* Lottie lock animation — fades in on lock/unlock, then fades out */}
          <Animated.View
            pointerEvents="none"
            renderToHardwareTextureAndroid={true}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              alignItems: 'center',
              marginBottom: s(-50),
              opacity: lockLottieOpacity,
            }}
          >
            <Lottie
              ref={lockLottieRef}
              source={require('../frontassets/Lock.json')}
              autoPlay={false}
              loop={false}
              style={{ width: s(220), height: s(165) }}
            />
          </Animated.View>
          <BlockNowButton
            onActivate={handleBlockNow}
            onUnlockPress={handleUnlockPress}
            onSlideUnlock={handleSlideUnlock}
            disabled={!currentPreset}
            isLocked={isLocked}
            hasActiveTimer={!!timeRemaining}
            strictMode={activePreset?.strictMode ?? false}
            onInteractionChange={setButtonInteracting}
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

                // Calculate time remaining or time until start
                const getTimeDisplay = () => {
                  const diff = isCurrentlyActive ? end.getTime() - now.getTime() : start.getTime() - now.getTime();
                  if (diff <= 0) return null;
                  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                  const minutes = Math.max(1, Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)));
                  if (days > 0) return `${days}d ${hours}h`;
                  if (hours > 0) return `${hours}h ${minutes}m`;
                  return `${minutes}m`;
                };
                const timeDisplay = getTimeDisplay();

                return (
                  <View
                    key={preset.id}
                    style={{ borderBottomWidth: index < scheduledPresets.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}
                    className="px-4 py-3"
                  >
                    <View className="flex-row items-center">
                      {/* Left side: Clock icon + text */}
                      <View className="flex-row items-center flex-1">
                        <View style={{ marginRight: s(15) }}>
                          <ClockIcon size={14} color={isCurrentlyActive ? colors.green : colors.yellow} />
                        </View>
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                            {preset.name}
                          </Text>
                          <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                            {formatScheduleDate(preset.scheduleStartDate!)} - {formatScheduleDate(preset.scheduleEndDate!)}
                          </Text>
                        </View>
                      </View>
                      {/* Right side: Timer display */}
                      {timeDisplay && (
                        <View style={{ marginLeft: s(12) }}>
                          <Text style={{ color: isCurrentlyActive ? colors.green : colors.yellow }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                            {timeDisplay}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Close Button */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <TouchableOpacity
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
