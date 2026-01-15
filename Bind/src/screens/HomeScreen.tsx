import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  NativeModules,
  TouchableOpacity,
  AppState,
  Animated,
  Vibration,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlockNowButton from '../components/BlockNowButton';
import InfoModal from '../components/InfoModal';
import EmergencyTapoutModal from '../components/EmergencyTapoutModal';
import AnimatedGradientImage from '../components/AnimatedGradientImage';
import AnimatedGradientText from '../components/AnimatedGradientText';
import { getPresets, getLockStatus, updateLockStatus, Preset, getEmergencyTapoutStatus, useEmergencyTapout, EmergencyTapoutStatus, activatePreset, getUserCardData, invalidateUserCaches, isFirstLoad, markInitialLoadComplete, clearAllCaches } from '../services/cardApi';
import { useTheme } from '../context/ThemeContext';

const scuteLogo = require('../frontassets/scutelogo.png');

const { BlockingModule } = NativeModules;


interface Props {
  email: string;
  onNavigateToPresets?: () => void;
  refreshTrigger?: number; // Incremented by parent to trigger refresh
}


function HomeScreen({ email, onNavigateToPresets, refreshTrigger }: Props) {
  const { colors } = useTheme();
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [scheduledPresets, setScheduledPresets] = useState<Preset[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockEndsAt, setLockEndsAt] = useState<string | null>(null);
  const [lockStartedAt, setLockStartedAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Emergency tapout state
  const [emergencyTapoutModalVisible, setEmergencyTapoutModalVisible] = useState(false);
  const [tapoutStatus, setTapoutStatus] = useState<EmergencyTapoutStatus | null>(null);
  const [tapoutLoading, setTapoutLoading] = useState(false);

  // Scheduled presets expandable modal
  const [scheduledPresetsModalVisible, setScheduledPresetsModalVisible] = useState(false);

  // Tap to unlock modal (shown when timer expired)
  const [tapToUnlockModalVisible, setTapToUnlockModalVisible] = useState(false);

  // Shake animation for locked card
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Fade animation for logo transition between locked/unlocked
  // Start both at 0 to avoid flash - will be set correctly after initial load
  const lockedOpacity = useRef(new Animated.Value(0)).current;
  const unlockedOpacity = useRef(new Animated.Value(0)).current;
  const hasInitializedLogoRef = useRef(false);

  // Shake animation when tapping locked card
  const triggerShakeAnimation = useCallback(() => {
    Vibration.vibrate([0, 50, 30, 50]); // pattern: wait, vibrate, wait, vibrate
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Show emergency tapout modal when tapping locked card
  const handleLockedCardPress = useCallback(async () => {
    triggerShakeAnimation();
    // Fetch fresh tapout status before showing modal
    const freshTapoutStatus = await getEmergencyTapoutStatus(email);
    setTapoutStatus(freshTapoutStatus);
    setEmergencyTapoutModalVisible(true);
  }, [triggerShakeAnimation, email]);

  const showModal = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);

  const checkRegistration = useCallback(async () => {
    try {
      // Check Supabase for registered card (source of truth)
      const userData = await getUserCardData(email);
      setIsRegistered(!!userData?.uid);
    } catch (error) {
      console.error('Failed to check registration:', error);
    }
  }, [email]);

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
              console.log('[HomeScreen] Canceling untimed lock for scheduled preset:', preset.name);
              return { preset, shouldOverride: true };
            }
            // If current lock ends AFTER the scheduled preset starts, it might be a different session
            // Don't override if it's already a timed lock
            console.log('[HomeScreen] Already locked with timed preset, not overriding');
            return null;
          }

          // Check if we're already activating this preset
          if (activatingPresetRef.current === preset.id) {
            return null;
          }

          console.log('[HomeScreen] Scheduled preset should activate:', preset.name);
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
      console.log('[HomeScreen] Activating scheduled preset:', preset.name);

      // Activate the preset in database
      await activatePreset(email, preset.id);

      // Use scheduleEndDate as the lock end time
      const lockEndsAtDate = preset.scheduleEndDate;

      // Update lock status in database
      await updateLockStatus(email, true, lockEndsAtDate);

      setIsLocked(true);
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
        });
      }

      Vibration.vibrate([0, 100, 50, 100]);
    } catch (error) {
      console.error('[HomeScreen] Failed to activate scheduled preset:', error);
    } finally {
      // Clear the activating ref after a delay to allow for settling
      setTimeout(() => {
        activatingPresetRef.current = null;
      }, 2000);
    }
  }, [email]);

  const loadStats = useCallback(async (skipCache = false) => {
    try {
      // Fetch presets, lock status, and tapout status in parallel
      const [presets, lockStatus, tapout] = await Promise.all([
        getPresets(email, skipCache),
        getLockStatus(email, skipCache),
        getEmergencyTapoutStatus(email),
      ]);

      // Check for scheduled presets that should activate
      const scheduledResult = await checkScheduledPresets(presets, lockStatus);
      if (scheduledResult) {
        const { preset, shouldOverride } = scheduledResult;

        // If we need to override an untimed lock, force unlock first
        if (shouldOverride) {
          console.log('[HomeScreen] Force unlocking untimed preset to activate scheduled preset');
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
          }
          await updateLockStatus(email, false, null);
        }

        await activateScheduledPreset(preset);
        return; // State will be updated by activateScheduledPreset
      }

      // Find active scheduled presets (sorted by start date) - only non-expired ones for the list
      const activeScheduled = presets
        .filter(p => p.isScheduled && p.isActive && p.scheduleEndDate)
        .filter(p => new Date(p.scheduleEndDate!) > new Date()) // Not expired
        .sort((a, b) => new Date(a.scheduleStartDate!).getTime() - new Date(b.scheduleStartDate!).getTime());
      setScheduledPresets(activeScheduled);

      // Find active non-scheduled preset
      const active = presets.find(p => p.isActive && !p.isScheduled);

      // Determine currently blocking preset
      const now = new Date();

      // If we're locked, check if there's a scheduled preset that was blocking (even if expired)
      // This keeps the preset showing until user taps their NFC card to unlock
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
        } else {
          // Check if there's an expired scheduled preset that was blocking
          // (lockEndsAt would match the scheduleEndDate)
          const expiredScheduled = presets.find(p =>
            p.isScheduled && p.isActive && p.scheduleEndDate &&
            new Date(p.scheduleEndDate) <= now &&
            lockStatus.lockEndsAt === p.scheduleEndDate
          );

          if (expiredScheduled) {
            // Keep showing the expired scheduled preset until user taps to unlock
            setCurrentPreset(expiredScheduled.name);
            setActivePreset(expiredScheduled);
          } else if (active) {
            // Regular active preset is blocking
            setCurrentPreset(active.name);
            setActivePreset(active);
          } else {
            // Locked but no matching preset found (edge case)
            setCurrentPreset(null);
            setActivePreset(null);
          }
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
      setLockEndsAt(lockStatus.lockEndsAt);
      setLockStartedAt(lockStatus.lockStartedAt);
      setTapoutStatus(tapout);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [email, checkScheduledPresets, activateScheduledPreset]);

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

    setTapoutLoading(true);
    try {
      // Pass the active preset ID so the backend can deactivate it
      // This prevents scheduled/timed presets from immediately re-activating
      const result = await useEmergencyTapout(email, activePreset?.id);
      if (result.success) {
        // Unlock was successful - refresh state
        setEmergencyTapoutModalVisible(false);
        setIsLocked(false);

        // Clear active preset since it was deactivated
        setActivePreset(null);
        setCurrentPreset(null);

        // Update database lock status to unlocked (already done by backend, but ensure local state is synced)
        await updateLockStatus(email, false, null);

        // Clear native blocking
        if (BlockingModule) {
          await BlockingModule.forceUnlock();
        }

        // Refresh status to get updated preset list
        await loadStats(true);

        Vibration.vibrate(100);
        showModal('Unlocked', `Phone unlocked. You have ${result.remaining} emergency tapout${result.remaining !== 1 ? 's' : ''} remaining.`);
      } else {
        showModal('Failed', 'Could not use emergency tapout. Please try again.');
      }
    } catch (error) {
      console.error('Failed to use emergency tapout:', error);
      showModal('Error', 'Something went wrong. Please try again.');
    } finally {
      setTapoutLoading(false);
    }
  }, [email, tapoutStatus, activePreset, loadStats, showModal]);

  // Load data on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      // On first app load (app was killed/restarted), clear all caches for fresh data
      // On subsequent navigations, only invalidate user-specific caches
      if (isFirstLoad()) {
        clearAllCaches();
        markInitialLoadComplete();
      } else {
        invalidateUserCaches(email);
      }
      await Promise.all([loadStats(true), checkRegistration()]);
      setLoading(false);
    }
    init();

    // Refresh preset when app comes to foreground
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Show loading spinner and fetch fresh data when returning to foreground
        setLoading(true);
        invalidateUserCaches(email);
        await loadStats(true);
        setLoading(false);
      }
    });

    // Check for scheduled presets every 30 seconds (uses cache for efficiency)
    // Scheduled preset activation is also handled by the native module for precision
    const scheduleInterval = setInterval(() => {
      loadStats(); // Use cache - will only fetch if cache expired
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(scheduleInterval);
    };
  }, [loadStats, checkRegistration, email]);

  // Reload when refreshTrigger changes (e.g., after NFC unlock or scheduled preset from App.tsx)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[HomeScreen] Refresh triggered by parent');
      // Close any open modals (user tapped their card to unlock)
      setEmergencyTapoutModalVisible(false);
      setTapToUnlockModalVisible(false);
      // Show loading spinner and fetch fresh data
      setLoading(true);
      invalidateUserCaches(email);
      Promise.all([loadStats(true), checkRegistration()]).finally(() => {
        setLoading(false);
      });
    }
  }, [refreshTrigger, loadStats, checkRegistration, email]);


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
        // Native TimerPresetReceiver and ScheduledPresetReceiver now handle all notifications
        // via AlarmManager, so we don't need to trigger notifications from JS anymore.
        // This prevents duplicate notifications when navigating back to this screen.
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
  }, [isLocked, lockEndsAt, activePreset?.isScheduled]);

  // Logo transition animation when lock state changes
  // Only show animated gradient when actively locked (has countdown or elapsed time)
  const isActivelyLocked = isLocked && (timeRemaining !== null || elapsedTime !== null);

  useEffect(() => {
    // Skip animation while still loading - both opacities stay at 0
    if (loading) {
      return;
    }

    // On first render after loading completes, set initial state without animation
    if (!hasInitializedLogoRef.current) {
      hasInitializedLogoRef.current = true;
      if (isActivelyLocked) {
        lockedOpacity.setValue(1);
        unlockedOpacity.setValue(0);
      } else {
        lockedOpacity.setValue(0);
        unlockedOpacity.setValue(1);
      }
      return;
    }

    // Subsequent changes animate smoothly
    if (isActivelyLocked) {
      // Fade in locked logo, fade out unlocked logo
      Animated.parallel([
        Animated.timing(lockedOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(unlockedOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out locked logo, fade in unlocked logo
      Animated.parallel([
        Animated.timing(lockedOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(unlockedOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActivelyLocked, lockedOpacity, unlockedOpacity, loading]);

  // Elapsed time effect (for no-time-limit locks)
  useEffect(() => {
    if (!isLocked || lockEndsAt || !lockStartedAt) {
      setElapsedTime(null);
      return;
    }

    function updateElapsed() {
      const startTime = new Date(lockStartedAt!).getTime();
      const now = Date.now();
      const diff = now - startTime;

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

  const handleConfigurePress = useCallback(() => {
    // If locked, show emergency tapout modal
    if (isLocked) {
      handleLockedCardPress();
      return;
    }

    // Card tap now always navigates to presets (when registered or not)
    if (onNavigateToPresets) {
      onNavigateToPresets();
    }
  }, [isLocked, handleLockedCardPress, onNavigateToPresets]);

  const handleRegisterPress = useCallback(() => {
    setShowRegisterModal(true);
  }, []);

  const handleRegistrationSuccess = useCallback(async () => {
    // Close the modal immediately
    setShowRegisterModal(false);

    // Invalidate cache and reload all user data after registration
    invalidateUserCaches(email);
    setLoading(true);
    await Promise.all([loadStats(true), checkRegistration()]);
    setLoading(false);
  }, [email, loadStats, checkRegistration]);

  // Memoize unlock press handler to prevent BlockNowButton re-renders
  const handleUnlockPress = useCallback(() => {
    if (timeRemaining) {
      // Timed preset still active - show emergency tapout modal
      setEmergencyTapoutModalVisible(true);
    } else {
      // No time limit preset or timer expired - show tap scute modal
      setTapToUnlockModalVisible(true);
    }
  }, [timeRemaining]);

  const handleBlockNow = useCallback(async () => {
    console.log('[HomeScreen] handleBlockNow called');
    console.log('[HomeScreen] isRegistered:', isRegistered);
    console.log('[HomeScreen] activePreset:', activePreset);

    try {
      if (!activePreset) {
        console.log('[HomeScreen] No active preset - showing modal');
        showModal(
          'No Preset Selected',
          'Please toggle a preset in the Presets tab before you can start blocking.'
        );
        return;
      }

      console.log('[HomeScreen] Attempting to start blocking with preset:', activePreset.name);

      // Calculate lock end time based on preset type
      let calculatedLockEndsAt: string | null = null;
      const now = new Date();

      // For non-scheduled presets, check if they would overlap with any active scheduled preset
      if (!activePreset.isScheduled && scheduledPresets.length > 0) {
        // Calculate when this block would end
        let blockEndTime: Date | null = null;

        if (activePreset.noTimeLimit) {
          // No time limit - would definitely overlap with any future scheduled preset
          const nextScheduled = scheduledPresets.find(sp =>
            new Date(sp.scheduleStartDate!) > now
          );
          if (nextScheduled) {
            showModal(
              'Schedule Conflict',
              `This preset has no time limit and would overlap with "${nextScheduled.name}" starting ${formatScheduleDate(nextScheduled.scheduleStartDate!)}.`
            );
            return;
          }
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
        console.log('[HomeScreen] DEBUG targetDate check:', {
          targetDate: activePreset.targetDate,
          noTimeLimit: activePreset.noTimeLimit,
          timerDays: activePreset.timerDays,
          timerHours: activePreset.timerHours,
          timerMinutes: activePreset.timerMinutes,
        });
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
      console.log('[HomeScreen] Updating lock status to locked, ends at:', calculatedLockEndsAt);
      await updateLockStatus(email, true, calculatedLockEndsAt);

      // Set local state immediately for instant UI update
      const nowISO = new Date().toISOString();
      setIsLocked(true);
      setLockEndsAt(calculatedLockEndsAt);
      setLockStartedAt(nowISO);

      // Call native blocking module
      if (BlockingModule) {
        console.log('[HomeScreen] BlockingModule exists, calling startBlocking');

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
        });

        console.log('[HomeScreen] BlockingModule.startBlocking completed');
        Vibration.vibrate(50);
        showModal('Blocking Started', `${activePreset.name} is now active.`);
      } else {
        console.log('[HomeScreen] BlockingModule is null/undefined - fallback mode');
        Vibration.vibrate(50);
        showModal('Blocking Started', `${activePreset.name} is now active.`);
      }
    } catch (error) {
      console.error('[HomeScreen] Failed to start blocking:', error);
      showModal('Error', 'Failed to start blocking session.');
    }
  }, [activePreset, email, isRegistered, showModal, scheduledPresets, formatScheduleDate]);

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

    if (activePreset.blockSettings) {
      settings.push('Settings');
    }

    return settings;
  }, [activePreset]);

  if (loading && !showRegisterModal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={colors.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View className="flex-1 px-6">
        {/* Fixed height status section at top */}
        <View style={{ height: 80 }} className="items-center justify-center mt-4">
          {isLocked && timeRemaining ? (
            <>
              <Text style={{ color: colors.textMuted }} className="text-base font-nunito mb-1">
                Will unlock in
              </Text>
              <Text style={{ color: colors.text }} className="text-4xl font-nunito-bold tracking-tight">
                {timeRemaining}
              </Text>
            </>
          ) : isLocked && elapsedTime ? (
            <>
              <Text style={{ color: colors.textMuted }} className="text-base font-nunito">
                Locked for
              </Text>
              <Text style={{ color: colors.text }} className="text-4xl font-nunito-bold tracking-tight mt-2">
                {elapsedTime}
              </Text>
            </>
          ) : isLocked ? (
            <>
              <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold mb-1">
                Locked
              </Text>
              <Text style={{ color: colors.textMuted }} className="text-base font-nunito">
                Tap to Unlock
              </Text>
            </>
          ) : (
            <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold">
              Not Locked
            </Text>
          )}
        </View>

        {/* Scute Logo - gradient when actively locked, tinted when unlocked or ready to unlock */}
        <TouchableOpacity
          onPress={handleConfigurePress}
          activeOpacity={isLocked ? 1 : 0.7}
          className="items-center my-6"
        >
          <Animated.View
            style={{ transform: [{ translateX: shakeAnim }] }}
            className="items-center justify-center"
          >
            {/* Unlocked logo - fades out when actively locked */}
            <Animated.View style={{ opacity: unlockedOpacity, position: 'absolute' }}>
              <Image
                source={scuteLogo}
                style={{
                  width: 200,
                  height: 200,
                  tintColor: colors.logoTint,
                }}
                resizeMode="contain"
              />
            </Animated.View>
            {/* Locked logo with gradient - fades in when actively locked */}
            <Animated.View style={{ opacity: lockedOpacity }}>
              <AnimatedGradientImage
                source={scuteLogo}
                width={200}
                height={200}
                glow
              />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>

        {/* Preset info - fixed height section */}
        <View style={{ minHeight: 100 }} className="items-center">
          {isRegistered ? (
            <>
              <View className="items-center justify-center">
                {/* Show gradient only when actively locked (has countdown or elapsed time) */}
                {isLocked && (timeRemaining || elapsedTime) ? (
                  <AnimatedGradientText
                    text={`Preset: ${currentPreset || 'None Selected'}`}
                    fontSize={18}
                    fontFamily="Nunito-SemiBold"
                    glow
                  />
                ) : (
                  <Text
                    style={{ color: colors.text }}
                    className="text-xl font-nunito-semibold text-center"
                  >
                    Preset: {currentPreset || 'None Selected'}
                  </Text>
                )}
              </View>

              {/* Active settings display */}
              {activePreset && getActiveSettingsDisplay().length > 0 && (
                <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mt-2">
                  Blocking {getActiveSettingsDisplay().join(', ')}
                </Text>
              )}

              {/* Scheduled Presets Button - matte style */}
              {scheduledPresets.length > 0 && (
                <TouchableOpacity
                  onPress={() => setScheduledPresetsModalVisible(true)}
                  activeOpacity={0.7}
                  className="mt-6 px-5 py-2.5 rounded-full flex-row items-center"
                  style={{
                    backgroundColor: colors.card,
                  }}
                >
                  <View style={{
                    backgroundColor: (() => {
                      const now = new Date();
                      // Check if any is currently active
                      const hasActive = scheduledPresets.some(p => {
                        const start = new Date(p.scheduleStartDate!);
                        const end = new Date(p.scheduleEndDate!);
                        return now >= start && now < end;
                      });
                      if (hasActive) return colors.green;
                      // Check if any is pending
                      const hasPending = scheduledPresets.some(p => {
                        const start = new Date(p.scheduleStartDate!);
                        return now < start;
                      });
                      if (hasPending) return colors.cyan;
                      return colors.textSecondary;
                    })()
                  }} className="w-2 h-2 rounded-full mr-2" />
                  <Text style={{ color: colors.text }} className="text-sm font-nunito-semibold">
                    {scheduledPresets.length} Scheduled
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={{ color: colors.text }} className="text-xl font-nunito-semibold">
              Not Registered
            </Text>
          )}
        </View>

        {/* Spacer to push button to bottom */}
        <View className="flex-1" />

        {/* Action Button - clean matte style */}
        <View className="mb-10">
          <BlockNowButton
            onActivate={isRegistered ? handleBlockNow : handleRegisterPress}
            onUnlockPress={handleUnlockPress}
            disabled={isRegistered && !currentPreset}
            isRegistered={isRegistered}
            isLocked={isLocked}
            hasActiveTimer={!!(timeRemaining || elapsedTime)}
          />
        </View>
      </View>


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

      {/* Tap Scute to Unlock Modal */}
      <Modal
        visible={tapToUnlockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTapToUnlockModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTapToUnlockModalVisible(false)}
          className="flex-1 bg-black/70 justify-center items-center px-6"
        >
          <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
            <View className="p-6 items-center">
              <View style={{ backgroundColor: `${colors.green}33` }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Image
                  source={scuteLogo}
                  style={{ width: 40, height: 40, tintColor: colors.green }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center">
                Tap Scute to Unlock
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito text-center mt-2">
                Hold your Scute card to the back of your phone to unlock.
              </Text>
            </View>
            <View style={{ borderTopColor: colors.border }} className="border-t">
              <TouchableOpacity
                onPress={() => setTapToUnlockModalVisible(false)}
                activeOpacity={0.7}
                className="py-4 items-center"
              >
                <Text style={{ color: colors.textSecondary }} className="text-base font-nunito-semibold">
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Scheduled Presets Modal */}
      <Modal
        visible={scheduledPresetsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduledPresetsModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden max-h-[70%]">
            {/* Header */}
            <View style={{ borderBottomColor: colors.border }} className="p-4 border-b">
              <Text style={{ color: colors.text }} className="text-lg font-nunito-bold text-center">
                Scheduled Presets
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito text-center mt-1">
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
                const isPending = now < start;

                return (
                  <View
                    key={preset.id}
                    style={{ borderBottomColor: colors.border }}
                    className={`p-4 ${index < scheduledPresets.length - 1 ? 'border-b' : ''}`}
                  >
                    <View className="flex-row items-center">
                      <View style={{ backgroundColor: isCurrentlyActive ? colors.green : colors.cyan }} className="w-2 h-2 rounded-full mr-3" />
                      <View className="flex-1">
                        <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                          {preset.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-1">
                          {formatScheduleDate(preset.scheduleStartDate!)} — {formatScheduleDate(preset.scheduleEndDate!)}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: isCurrentlyActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 211, 238, 0.2)' }} className="px-2 py-0.5 rounded">
                        <Text style={{ color: isCurrentlyActive ? colors.green : colors.cyan }} className="text-xs font-nunito-semibold">
                          {isCurrentlyActive ? 'Active' : isPending ? 'Pending' : 'Scheduled'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Close Button */}
            <View style={{ borderTopColor: colors.border }} className="border-t">
              <TouchableOpacity
                onPress={() => setScheduledPresetsModalVisible(false)}
                activeOpacity={0.7}
                className="py-4 items-center"
              >
                <Text style={{ color: colors.textSecondary }} className="text-base font-nunito-semibold">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(HomeScreen);
