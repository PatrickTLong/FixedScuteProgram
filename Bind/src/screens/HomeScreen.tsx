import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  Text,
  View,
  NativeModules,
  AppState,
  Pressable,
  ScrollView,
  Modal,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { AlarmIcon as PhosphorAlarmIcon, LockIcon, LockOpenIcon } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';

import HeaderIconButton from '../components/HeaderIconButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlockNowButton from '../components/BlockNowButton';
import InfoModal from '../components/InfoModal';
import EmergencyTapoutModal from '../components/EmergencyTapoutModal';
import { updateLockStatus, Preset, useEmergencyTapout, activatePreset, savePreset, invalidateUserCaches } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';




const { BlockingModule, PermissionsModule } = NativeModules;

// Alarm icon for schedule badges
const AlarmIcon = ({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <PhosphorAlarmIcon size={size} color={color} weight="fill" />
);


function HomeScreen() {
  const { userEmail: email, refreshTrigger, sharedPresets, setSharedPresets, sharedPresetsLoaded, sharedLockStatus, setSharedLockStatus, tapoutStatus, setTapoutStatus, refreshAll } = useAuth();
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
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

  // Notification permission state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Widget bubble disabled toggle
  const [widgetBubbleDisabled, setWidgetBubbleDisabled] = useState(false);


  // Lock icon animation (slides up, holds, fades out)
  const lockIconOpacity = useRef(new Animated.Value(0)).current;
  const lockIconScale = useRef(new Animated.Value(0)).current;
  const lockIconTranslateY = useRef(new Animated.Value(10)).current;
  const lockAnimRef = useRef<{ slideIn: Animated.CompositeAnimation; fadeOut: Animated.CompositeAnimation } | null>(null);
  const lockRafRef = useRef<number | null>(null);
  const prevIsLockedRef = useRef(isLocked);
  const [lastLockAction, setLastLockAction] = useState<'lock' | 'unlock' | null>(null);

  // Track app foreground/background so handleTimerExpired can defer UI updates
  const appStateRef = useRef(AppState.currentState);
  // Guard to prevent handleTimerExpired from firing multiple times while backgrounded
  const timerExpiredRef = useRef(false);
  // Guard to prevent loadStats from overwriting optimistic lock/unlock state while backend sync is in-flight
  const optimisticLockGuardRef = useRef(false);
  // Guard to prevent concurrent loadStats calls (e.g. mount + AppState 'active' both firing)
  const loadStatsInProgressRef = useRef(false);
  // Mirror activePreset so handleTimerExpired can read it without a stale closure
  const activePresetRef = useRef<Preset | null>(null);
  // Keep ref in sync so handleTimerExpired always sees current value
  useEffect(() => { activePresetRef.current = activePreset; }, [activePreset]);

  // Reset lock icon when screen loses focus so it doesn't freeze mid-animation
  useEffect(() => {
    if (!isFocused) {
      // Cancel any pending requestAnimationFrame so it can't restart the animation after reset
      if (lockRafRef.current != null) {
        cancelAnimationFrame(lockRafRef.current);
        lockRafRef.current = null;
      }
      if (lockAnimRef.current) {
        lockAnimRef.current.slideIn.stop();
        lockAnimRef.current.fadeOut.stop();
        lockAnimRef.current = null;
      }
      lockIconOpacity.setValue(0);
      lockIconScale.setValue(0);
      lockIconTranslateY.setValue(10);
    }
  }, [isFocused, lockIconOpacity, lockIconScale, lockIconTranslateY]);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);




  const showModal = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);

  const openNotificationSettings = useCallback(async () => {
    if (!BlockingModule?.openNotificationSettings) return;
    try {
      await BlockingModule.openNotificationSettings();
    } catch {}
  }, []);

  const toggleWidgetBubble = useCallback(async () => {
    if (!BlockingModule?.setWidgetBubbleDisabled) return;
    const newValue = !widgetBubbleDisabled;
    setWidgetBubbleDisabled(newValue);
    try {
      await BlockingModule.setWidgetBubbleDisabled(newValue);
    } catch {}
  }, [widgetBubbleDisabled]);

  // Track which scheduled preset we're currently activating to prevent duplicates
  const activatingPresetRef = useRef<string | null>(null);

  // Check and activate scheduled presets
  const checkScheduledPresets = useCallback(async (presets: Preset[], currentLockStatus: { isLocked: boolean; lockEndsAt: string | null }) => {
    const now = new Date();
    console.log('[SCHED-DEBUG] checkScheduledPresets called', { presetsCount: presets.length, isLocked: currentLockStatus.isLocked, lockEndsAt: currentLockStatus.lockEndsAt });

    // Find scheduled presets that should be activated now
    for (const preset of presets) {
      if (preset.isScheduled && preset.isActive && preset.scheduleStartDate && preset.scheduleEndDate) {
        const startDate = new Date(preset.scheduleStartDate);
        const endDate = new Date(preset.scheduleEndDate);

        console.log('[SCHED-DEBUG] Checking preset:', { id: preset.id, name: preset.name, start: preset.scheduleStartDate, end: preset.scheduleEndDate, nowInWindow: now >= startDate && now < endDate, customBlockedText: preset.customBlockedText });

        // Check if current time is within the schedule window
        if (now >= startDate && now < endDate) {
          // If already locked with a timed preset (not this scheduled one), check if we should override
          if (currentLockStatus.isLocked) {
            // If current lock has no end time (untimed), auto-cancel it for the scheduled preset
            if (!currentLockStatus.lockEndsAt) {
              // Check if we're already activating this preset
              if (activatingPresetRef.current === preset.id) {
                console.log('[SCHED-DEBUG] Already activating this preset, skipping');
                return null;
              }
              console.log('[SCHED-DEBUG] Will override untimed lock for scheduled preset');
              return { preset, shouldOverride: true };
            }
            // If current lock ends AFTER the scheduled preset starts, it might be a different session
            // Don't override if it's already a timed lock
            console.log('[SCHED-DEBUG] Already locked with timed preset, not overriding');
            return null;
          }

          // Check if we're already activating this preset
          if (activatingPresetRef.current === preset.id) {
            console.log('[SCHED-DEBUG] Already activating this preset, skipping');
            return null;
          }

          console.log('[SCHED-DEBUG] Found preset to activate:', preset.name);
          return { preset, shouldOverride: false };
        }
      }
    }

    console.log('[SCHED-DEBUG] No scheduled presets to activate');
    return null;
  }, []);

  // Activate a scheduled preset
  const activateScheduledPreset = useCallback(async (preset: Preset) => {
    console.log('[SCHED-DEBUG] activateScheduledPreset called:', { id: preset.id, name: preset.name, strictMode: preset.strictMode, customBlockedText: preset.customBlockedText, blockSettings: preset.blockSettings, scheduleEnd: preset.scheduleEndDate });
    // Set the ref to prevent duplicate activations
    activatingPresetRef.current = preset.id;

    try {
      // Activate the preset in database
      console.log('[SCHED-DEBUG] Calling activatePreset in DB...');
      await activatePreset(email, preset.id);

      // Use scheduleEndDate as the lock end time
      const lockEndsAtDate = preset.scheduleEndDate;

      // Update lock status in database
      console.log('[SCHED-DEBUG] Calling updateLockStatus...', { lockEndsAtDate });
      await updateLockStatus(email, true, lockEndsAtDate);

      console.log('[SCHED-DEBUG] Setting shared lock status and active preset state');
      setSharedLockStatus({ isLocked: true, lockStartedAt: new Date().toISOString(), lockEndsAt: lockEndsAtDate ?? null });
      setCurrentPreset(preset.name);
      setActivePreset(preset);

      // Call native blocking module — but only if native isn't already blocking
      // (ScheduledPresetReceiver may have already started the session natively while the app was closed)
      if (BlockingModule) {
        const alreadyBlocking = await BlockingModule.isBlocking();
        console.log('[SCHED-DEBUG] Native isBlocking check:', alreadyBlocking);

        if (alreadyBlocking) {
          console.log('[SCHED-DEBUG] Native is already blocking — skipping startBlocking to avoid duplicate notification');
        } else {
          // Calculate lockEndTimeMs from scheduleEndDate so native side gets the correct end time
          const lockEndTimeMs = lockEndsAtDate ? new Date(lockEndsAtDate).getTime() : 0;
          const blockingConfig = {
            mode: preset.mode,
            selectedApps: preset.selectedApps,
            blockedWebsites: preset.blockedWebsites,
            timerDays: 0,
            timerHours: 0,
            timerMinutes: 0,
            lockEndTimeMs,
            blockSettings: preset.blockSettings,
            noTimeLimit: false,
            presetName: preset.name,
            presetId: preset.id,
            isScheduled: true,
            strictMode: preset.strictMode ?? false,
            customBlockedText: preset.customBlockedText ?? '',
            customOverlayImage: preset.customOverlayImage ?? '',
            customRedirectUrl: preset.customRedirectUrl ?? '',
          };
          console.log('[OVERLAY] Scheduled startBlocking — customBlockedText:', blockingConfig.customBlockedText || '(none)', 'customOverlayImage:', blockingConfig.customOverlayImage || '(none)');
          console.log('[SCHED-DEBUG] Calling BlockingModule.startBlocking:', JSON.stringify(blockingConfig));
          await BlockingModule.startBlocking(blockingConfig);
          console.log('[SCHED-DEBUG] BlockingModule.startBlocking completed');
        }
      } else {
        console.log('[SCHED-DEBUG] WARNING: BlockingModule is null/undefined!');
      }

    } catch (error) {
      console.log('[SCHED-DEBUG] ERROR in activateScheduledPreset:', error);
    } finally {
      // Clear the activating ref after a delay to allow for settling
      setTimeout(() => {
        activatingPresetRef.current = null;
      }, 2000);
    }
  }, [email]);

  const loadStats = useCallback(async (skipCache = false, showLoading = false) => {
    // Prevent concurrent loadStats calls — when the app opens from a terminated state,
    // both the mount useEffect and the AppState 'active' listener fire loadStats.
    // The second call would get stale backend data and overwrite the state set by the first.
    if (loadStatsInProgressRef.current) {
      console.log('[SCHED-DEBUG] loadStats: SKIPPED — another loadStats call is already in progress');
      return;
    }
    loadStatsInProgressRef.current = true;

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
      console.log('[SCHED-DEBUG] loadStats: checking scheduled presets...', { lockStatus, activeScheduledCount: activeScheduled.length });
      const scheduledResult = await checkScheduledPresets(presets, lockStatus);
      if (scheduledResult) {
        const { preset, shouldOverride } = scheduledResult;
        console.log('[SCHED-DEBUG] loadStats: scheduled preset found to activate:', { name: preset.name, id: preset.id, shouldOverride });

        // If we need to override an untimed lock, force unlock first
        if (shouldOverride) {
          console.log(`[SCHED-DEBUG] loadStats: OVERRIDE — scheduled preset "${preset.name}" overriding untimed lock`);
          console.log('[SCHED-DEBUG] loadStats: calling BlockingModule.forceUnlock()...');
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
            console.log('[SCHED-DEBUG] loadStats: forceUnlock complete — old bubble dismissed, native session cleared');
          }
          // Deactivate ONLY the active non-scheduled preset (not all presets)
          // Using savePreset instead of activatePreset(null) to preserve scheduled preset states
          const activeNonScheduled = presets.find((p: Preset) => p.isActive && !p.isScheduled);
          if (activeNonScheduled) {
            console.log(`[SCHED-DEBUG] loadStats: deactivating ONLY non-scheduled preset "${activeNonScheduled.name}" (id: ${activeNonScheduled.id}, noTimeLimit: ${activeNonScheduled.noTimeLimit}) via savePreset — scheduled presets preserved`);
            await savePreset(email, { ...activeNonScheduled, isActive: false });
            // Update shared state so PresetsScreen toggle reflects the change immediately
            setSharedPresets(prev => prev.map(p =>
              p.id === activeNonScheduled.id ? { ...p, isActive: false } : p
            ));
            console.log(`[SCHED-DEBUG] loadStats: sharedPresets updated — "${activeNonScheduled.name}" toggle set to OFF`);
          } else {
            console.log('[SCHED-DEBUG] loadStats: no active non-scheduled preset found to deactivate');
          }
          await updateLockStatus(email, false, null);
          invalidateUserCaches(email);
          console.log('[SCHED-DEBUG] loadStats: override complete — lock cleared, caches invalidated, now activating scheduled preset');
        }

        console.log('[SCHED-DEBUG] loadStats: calling activateScheduledPreset...');
        await activateScheduledPreset(preset);
        // Also set state that would normally be set
        setScheduledPresets(activeScheduled);
        setTapoutStatus(tapout);
        hideLoading();
        console.log('[SCHED-DEBUG] loadStats: returning early after scheduled activation');
        return; // State will be updated by activateScheduledPreset
      } else {
        console.log('[SCHED-DEBUG] loadStats: no scheduled preset to activate');
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
          console.log(`[SCHED-DEBUG] loadStats: AUTO-UNLOCK — timed lock expired (lockEndsAt: ${lockStatus.lockEndsAt}), auto-unlocking`);
          // Lock has expired - auto-unlock but keep preset active
          try {
            await updateLockStatus(email, false, null);
            if (BlockingModule) {
              await BlockingModule.forceUnlock();
            }
            invalidateUserCaches(email);

            setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
            // For dated presets whose target date is past, clear the preset cleanly.
            // For timer presets (no targetDate), keep it selected so user can re-lock easily.
            if (active && active.targetDate && new Date(active.targetDate) <= now) {
              console.log(`[SCHED-DEBUG] loadStats: AUTO-UNLOCK — dated preset "${active.name}" target date passed, clearing preset`);
              setCurrentPreset(null);
              setActivePreset(null);
            } else if (active) {
              console.log(`[SCHED-DEBUG] loadStats: AUTO-UNLOCK — timer preset "${active.name}" kept selected (can re-lock)`);
              setCurrentPreset(active.name);
              setActivePreset(active);
            } else {
              console.log('[SCHED-DEBUG] loadStats: AUTO-UNLOCK — no active preset found after unlock');
            }
            setScheduledPresets(activeScheduled);
            setTapoutStatus(tapout);
            hideLoading();
            console.log('[SCHED-DEBUG] loadStats: AUTO-UNLOCK complete, returning early');
            return; // Exit early, state is set
          } catch (error) {
            console.log('[SCHED-DEBUG] loadStats: AUTO-UNLOCK failed:', error);
            // Continue with normal flow if auto-unlock fails
          }
        }
      }

      // If we're locked, check if there's a scheduled preset that was blocking (even if expired)
      // This keeps the preset showing until user unlocks
      console.log('[SCHED-DEBUG] loadStats: lock status path', { isLocked: lockStatus.isLocked, lockEndsAt: lockStatus.lockEndsAt, activePresetName: active?.name, activeScheduledCount: activeScheduled.length });
      if (lockStatus.isLocked) {
        // First check for a currently active scheduled preset
        const currentlyBlockingScheduled = activeScheduled.find((p: Preset) => {
          const start = new Date(p.scheduleStartDate!);
          const end = new Date(p.scheduleEndDate!);
          return now >= start && now < end;
        });

        if (currentlyBlockingScheduled) {
          console.log('[SCHED-DEBUG] loadStats: locked with scheduled preset:', currentlyBlockingScheduled.name);
          // A scheduled preset is currently in its window and blocking
          setCurrentPreset(currentlyBlockingScheduled.name);
          setActivePreset(currentlyBlockingScheduled);
        } else if (active) {
          console.log('[SCHED-DEBUG] loadStats: locked with regular preset:', active.name);
          // Regular active preset is blocking (no-time-limit preset)
          setCurrentPreset(active.name);
          setActivePreset(active);
        } else {
          console.log('[SCHED-DEBUG] loadStats: locked but no matching preset found');
          // Locked but no matching preset found (edge case)
          setCurrentPreset(null);
          setActivePreset(null);
        }
      } else {
        // Not locked - show the active preset if any
        if (active) {
          console.log('[SCHED-DEBUG] loadStats: not locked, active preset:', active.name);
          setCurrentPreset(active.name);
          setActivePreset(active);
        } else {
          console.log('[SCHED-DEBUG] loadStats: not locked, no active preset');
          setCurrentPreset(null);
          setActivePreset(null);
        }
      }

      // Sync lock status to shared state (refreshAll returns data without setting it,
      // so this is the single setter for the normal non-expired path)
      // Skip if an optimistic lock/unlock is in-flight — stale backend data would overwrite it
      if (optimisticLockGuardRef.current) {
        console.log('[RACE-GUARD] loadStats: skipping setSharedLockStatus — optimistic update in-flight');
      } else {
        setSharedLockStatus(lockStatus);
      }
      setTapoutStatus(tapout);
      hideLoading();
    } catch (error) {
      hideLoading();
    } finally {
      loadStatsInProgressRef.current = false;
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
    console.log('[UNLOCK-DEBUG] handleUseEmergencyTapout called:', { presetId: activePreset?.id, isScheduled: activePreset?.isScheduled });
    try {
      // Tapout API must succeed before unlocking (decrements tapout count)
      const result = await useEmergencyTapout(email);
      console.log('[UNLOCK-DEBUG] emergencyTapout result:', { success: result.success, remaining: result.remaining });
      if (result.success) {
        // Unlock UI — clear timer in same render for smooth transition
        console.log('[UNLOCK-DEBUG] emergencyTapout: setting optimistic unlock state');
        optimisticLockGuardRef.current = true;
        setEmergencyTapoutModalVisible(false);
        setTapoutLoading(false);
        setLoading(false);
        setTimeRemaining(null);
        setElapsedTime(null);
        setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
        setTapoutStatus(tapoutStatus ? { ...tapoutStatus, remaining: result.remaining, nextRefillDate: result.nextRefillDate } : null);
        if (isScheduledPreset) {
          console.log(`[UNLOCK-DEBUG] emergencyTapout: tapping out of SCHEDULED preset "${activePreset?.name}" (id: ${presetIdToKeep}) — clearing UI state and deactivating`);
          setCurrentPreset(null);
          setActivePreset(null);
          if (presetIdToKeep) {
            setSharedPresets(prev => prev.map(p =>
              p.id === presetIdToKeep ? { ...p, isActive: false } : p
            ));
            console.log(`[UNLOCK-DEBUG] emergencyTapout: sharedPresets updated — scheduled preset toggle set to OFF`);
          }
        } else {
          console.log(`[UNLOCK-DEBUG] emergencyTapout: tapping out of NON-SCHEDULED preset "${activePreset?.name}" (id: ${presetIdToKeep}, noTimeLimit: ${activePreset?.noTimeLimit}) — keeping preset selected`);
        }

        // Fire-and-forget: native unlock + backend sync
        (async () => {
          try {
            console.log('[UNLOCK-DEBUG] emergencyTapout: fire-and-forget — calling forceUnlock + backend sync');
            if (BlockingModule) {
              await BlockingModule.forceUnlock();
              console.log('[UNLOCK-DEBUG] emergencyTapout: forceUnlock complete');
            }
            await updateLockStatus(email, false, null);
            if (isScheduledPreset && presetIdToKeep) {
              // Deactivate only this scheduled preset, not all presets
              console.log(`[UNLOCK-DEBUG] emergencyTapout: deactivating ONLY scheduled preset "${activePreset?.name}" via savePreset — other scheduled presets preserved`);
              const presetToDeactivate = sharedPresets.find(p => p.id === presetIdToKeep);
              if (presetToDeactivate) {
                await savePreset(email, { ...presetToDeactivate, isActive: false });
                console.log('[UNLOCK-DEBUG] emergencyTapout: scheduled preset deactivated in backend');
              }
            } else if (presetIdToKeep) {
              console.log(`[UNLOCK-DEBUG] emergencyTapout: re-activating non-scheduled preset "${activePreset?.name}" in backend`);
              await activatePreset(email, presetIdToKeep);
            }
            invalidateUserCaches(email);
            console.log('[UNLOCK-DEBUG] emergencyTapout: backend sync complete');
          } catch {
            // Backend sync failed silently — state will reconcile on next app foreground
          } finally {
            optimisticLockGuardRef.current = false;
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
      appStateRef.current = nextAppState;
      if (nextAppState === 'active') {
        invalidateUserCaches(email);
        await loadStats(true, false); // skipCache=true, showLoading=false
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadStats, email]);

  // Check notification permission on mount and when app returns to foreground
  useEffect(() => {
    const checkNotificationPermission = () => {
      if (BlockingModule?.areNotificationsEnabled) {
        BlockingModule.areNotificationsEnabled().then((enabled: boolean) => {
          setNotificationsEnabled(enabled);
        }).catch(() => {});
      }
    };
    checkNotificationPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkNotificationPermission();
    });
    return () => sub.remove();
  }, []);

  // Load widget bubble disabled preference on mount
  useEffect(() => {
    if (BlockingModule?.getWidgetBubbleDisabled) {
      BlockingModule.getWidgetBubbleDisabled().then((disabled: boolean) => {
        setWidgetBubbleDisabled(disabled);
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
  // Also reacts to lock status changes so scheduled presets appear immediately
  // Note: Expiration checking is handled globally in AuthContext
  useEffect(() => {
    if (!sharedPresetsLoaded || loading) return;

    // Update active non-scheduled preset
    // Skip dated presets whose targetDate has passed when unlocked — same idea as
    // !p.isScheduled naturally skipping scheduled presets after their window ends.
    const now = new Date();
    const active = sharedPresets.find(p =>
      p.isActive && !p.isScheduled &&
      !(p.targetDate && !isLocked && new Date(p.targetDate) <= now)
    );
    if (active) {
      setCurrentPreset(active.name);
      setActivePreset(active);
    } else if (isLocked) {
      // When locked with no regular active preset, find the scheduled preset in its blocking window
      const blockingScheduled = sharedPresets.find(p =>
        p.isScheduled && p.isActive && p.scheduleStartDate && p.scheduleEndDate &&
        now >= new Date(p.scheduleStartDate) && now < new Date(p.scheduleEndDate)
      );
      if (blockingScheduled) {
        setCurrentPreset(blockingScheduled.name);
        setActivePreset(blockingScheduled);
      }
    } else {
      setCurrentPreset(null);
      setActivePreset(null);
    }

    // Update scheduled presets list
    const activeScheduled = sharedPresets
      .filter(p => p.isScheduled && p.isActive && p.scheduleEndDate)
      .filter(p => new Date(p.scheduleEndDate!) > new Date())
      .sort((a, b) => new Date(a.scheduleStartDate!).getTime() - new Date(b.scheduleStartDate!).getTime());
    setScheduledPresets(activeScheduled);
  }, [sharedPresets, sharedPresetsLoaded, isLocked]);

  // Auto-unlock when timer expires (called from countdown effect)
  const handleTimerExpired = useCallback(async () => {
    // Guard: only handle once per lock session (interval may fire repeatedly while backgrounded)
    if (timerExpiredRef.current) return;
    timerExpiredRef.current = true;
    console.log('[UNLOCK-DEBUG] handleTimerExpired called, appState:', appStateRef.current);

    try {
      // Only update UI if app is in foreground; if backgrounded, loadStats
      // will handle the clean transition when the user returns (single animation play).
      if (appStateRef.current === 'active') {
        console.log('[UNLOCK-DEBUG] timerExpired: setting optimistic unlock state (foreground)');
        optimisticLockGuardRef.current = true;
        setTimeRemaining(null);
        setElapsedTime(null);
        setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });

        // For dated presets, clear the preset in the same render batch so there's
        // no frame where "Not Locked" shows but the preset name still lingers.
        const expiredPreset = activePresetRef.current;
        if (expiredPreset?.targetDate && new Date(expiredPreset.targetDate) <= new Date()) {
          setCurrentPreset(null);
          setActivePreset(null);
          setSharedPresets(prev => prev.map(p =>
            p.id === expiredPreset.id ? { ...p, isActive: false } : p
          ));
        }
      } else {
        console.log('[UNLOCK-DEBUG] timerExpired: app backgrounded, skipping UI update');
      }

      // Fire-and-forget: native unlock + backend sync (always runs)
      (async () => {
        try {
          console.log('[UNLOCK-DEBUG] timerExpired: calling updateLockStatus + forceUnlock...');
          await updateLockStatus(email, false, null);
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
          }
          invalidateUserCaches(email);
          console.log('[UNLOCK-DEBUG] timerExpired: backend sync complete');
        } catch {
          console.log('[UNLOCK-DEBUG] timerExpired: backend sync failed');
        } finally {
          optimisticLockGuardRef.current = false;
        }
      })();
    } catch (error) {
      console.log('[UNLOCK-DEBUG] handleTimerExpired error:', error);
    }
  }, [email]);

  // Countdown timer effect (for timed locks)
  useEffect(() => {
    if (!isLocked || !lockEndsAt) {
      setTimeRemaining(null);
      return;
    }

    // New lock started — reset the expiration guard so this session can fire
    timerExpiredRef.current = false;

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

  // Lock/unlock icon animation — only plays while HomeScreen is focused (not on return)
  useEffect(() => {
    if (prevIsLockedRef.current !== isLocked) {
      setLastLockAction(isLocked ? 'lock' : 'unlock');

      // Stop any running animations first
      if (lockAnimRef.current) {
        lockAnimRef.current.slideIn.stop();
        lockAnimRef.current.fadeOut.stop();
      }
      if (lockRafRef.current != null) {
        cancelAnimationFrame(lockRafRef.current);
        lockRafRef.current = null;
      }

      // Reset to invisible state
      lockIconScale.setValue(0);
      lockIconOpacity.setValue(0);
      lockIconTranslateY.setValue(10);

      // Show after one frame so reset values have applied
      lockRafRef.current = requestAnimationFrame(() => {
        lockRafRef.current = null;

        // If screen lost focus while waiting, bail out
        if (!isFocused) return;

        lockIconOpacity.setValue(1);

        // Slide up + scale in
        const slideIn = Animated.parallel([
          Animated.spring(lockIconScale, { toValue: 1, speed: 16, bounciness: 18, useNativeDriver: true }),
          Animated.timing(lockIconTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]);

        // Fade out after hold
        const fadeOut = Animated.sequence([
          Animated.delay(900),
          Animated.timing(lockIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]);

        lockAnimRef.current = { slideIn, fadeOut };
        slideIn.start();
        fadeOut.start();
      });
    }
    prevIsLockedRef.current = isLocked;
  }, [isLocked, isFocused, lockIconOpacity, lockIconScale, lockIconTranslateY]);

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
    console.log('[UNBLOCKING] handleUnlockPress — showing emergency tapout modal');
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
    console.log('[UNLOCK-DEBUG] handleSlideUnlock called:', { presetId: presetIdToKeep, isScheduled: isScheduledPreset });

    try {
      // Optimistic UI update — instant unlock, clear timer in same render
      console.log('[UNBLOCKING] slideUnlock: setting optimistic unlock state — isLocked=false');
      optimisticLockGuardRef.current = true;
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
          console.log('[UNBLOCKING] slideUnlock: calling forceUnlock...');
          if (BlockingModule) {
            await BlockingModule.forceUnlock();
            console.log('[UNBLOCKING] slideUnlock: forceUnlock done');
          }
          if (isScheduledPreset) {
            console.log('[UNBLOCKING] slideUnlock: calling useEmergencyTapout for scheduled...');
            await useEmergencyTapout(email, presetIdToKeep, true);
          } else {
            console.log('[UNBLOCKING] slideUnlock: calling updateLockStatus(false)...');
            await updateLockStatus(email, false, null);
            if (presetIdToKeep) {
              await activatePreset(email, presetIdToKeep);
            }
          }
          invalidateUserCaches(email);
          console.log('[UNBLOCKING] slideUnlock: backend sync complete — fully unblocked');
        } catch (err) {
          console.log('[UNBLOCKING] slideUnlock: backend sync FAILED:', err);
        } finally {
          optimisticLockGuardRef.current = false;
        }
      })();

    } catch (error) {
      console.log('[UNLOCK-DEBUG] handleSlideUnlock error:', error);
      showModal('Error', 'Failed to unlock. Please try again.');
    }
  }, [email, showModal, activePreset]);

  const handleBlockNow = useCallback(() => {

    console.log('[BLOCKING] handleBlockNow called', { preset: activePreset?.name, presetId: activePreset?.id, strictMode: activePreset?.strictMode, noTimeLimit: activePreset?.noTimeLimit });
    try {
      if (!activePreset) {
        console.log('[BLOCKING] No preset selected — showing modal');
        showModal(
          'No Preset Selected',
          'Please toggle a preset in the Presets tab before you can start blocking.'
        );
        return;
      }

      // Synchronous validation — no await, no lag
      let calculatedLockEndsAt: string | null = null;
      const now = new Date();

      // For non-scheduled presets, check if they would overlap with any active scheduled preset
      if (!activePreset.isScheduled && scheduledPresets.length > 0) {
        console.log(`[BLOCKING] Checking overlap: non-scheduled preset "${activePreset.name}" (noTimeLimit: ${activePreset.noTimeLimit}) vs ${scheduledPresets.length} active scheduled preset(s)`);
        let blockEndTime: Date | null = null;

        if (activePreset.noTimeLimit) {
          console.log('[BLOCKING] Preset is NO-TIME-LIMIT — skipping overlap check (scheduled preset will auto-override later via checkScheduledPresets)');
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

        if (blockEndTime) {
          for (const scheduled of scheduledPresets) {
            const schedStart = new Date(scheduled.scheduleStartDate!);
            const schedEnd = new Date(scheduled.scheduleEndDate!);

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

        calculatedLockEndsAt = activePreset.scheduleEndDate;
      } else if (!activePreset.noTimeLimit) {
        if (activePreset.targetDate) {
          calculatedLockEndsAt = activePreset.targetDate;
        } else {
          const nowCalc = new Date();
          const durationMs =
            (activePreset.timerDays * 24 * 60 * 60 * 1000) +
            (activePreset.timerHours * 60 * 60 * 1000) +
            (activePreset.timerMinutes * 60 * 1000) +
            ((activePreset.timerSeconds ?? 0) * 1000);
          calculatedLockEndsAt = new Date(nowCalc.getTime() + durationMs).toISOString();
        }
      }

      console.log('[BLOCKING] Validation passed, locking now', { calculatedLockEndsAt, isScheduled: activePreset.isScheduled });
      optimisticLockGuardRef.current = true;
      // Optimistic UI update — fires immediately, no awaits above
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
      console.log('[BLOCKING] Optimistic UI updated — isLocked=true, lockEndsAt=', calculatedLockEndsAt);

      // Fire-and-forget: permissions, backend, and native blocking all run after UI is updated
      (async () => {
        try {
          // Permission check — if it fails, roll back the optimistic UI
          if (PermissionsModule) {
            try {
              if (Platform.OS === 'ios') {
                const isScreenTimeAuthorized = await PermissionsModule.isScreenTimeAuthorized();
                if (!isScreenTimeAuthorized) {
                  setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
                  showModal('Permission Required', 'Screen Time access is not enabled. Please enable it to block apps.');
                  return;
                }
              } else {
                const isAccessibilityEnabled = await PermissionsModule.isAccessibilityServiceEnabled();
                if (!isAccessibilityEnabled) {
                  setSharedLockStatus({ isLocked: false, lockStartedAt: null, lockEndsAt: null });
                  showModal('Permission Required', 'Accessibility Service is not enabled. Please enable it in Settings to block apps.');
                  return;
                }
              }
            } catch {
              // Continue anyway if we can't check - native module might still work
            }
          }

          console.log('[BLOCKING] Permission check passed, calling updateLockStatus...');
          await updateLockStatus(email, true, calculatedLockEndsAt);
          console.log('[BLOCKING] updateLockStatus done, calling BlockingModule.startBlocking...');

          if (BlockingModule) {
            const lockEndTimeMs = calculatedLockEndsAt
              ? new Date(calculatedLockEndsAt).getTime()
              : 0;

            const resolvedNoTimeLimit = activePreset.noTimeLimit && !activePreset.isScheduled;
            console.log(`[PRESETS] HomeScreen startBlocking — preset "${activePreset.name}" (id: ${activePreset.id}) | noTimeLimit raw: ${activePreset.noTimeLimit}, isScheduled: ${activePreset.isScheduled}, resolved noTimeLimit sent to native: ${resolvedNoTimeLimit}`);
            console.log(`[OVERLAY] HomeScreen startBlocking — bgColor='${activePreset.customOverlayBgColor}', dismissText='${activePreset.customDismissText}', dismissColor='${activePreset.customDismissColor}', iconPos=(${activePreset.iconPosX},${activePreset.iconPosY}), blockedTextPos=(${activePreset.blockedTextPosX},${activePreset.blockedTextPosY}), dismissTextPos=(${activePreset.dismissTextPosX},${activePreset.dismissTextPosY}), iconVisible=${activePreset.iconVisible}, blockedTextVisible=${activePreset.blockedTextVisible}, dismissTextVisible=${activePreset.dismissTextVisible}, blockedTextSize=${activePreset.blockedTextSize}, dismissTextSize=${activePreset.dismissTextSize}`);
            if (activePreset.noTimeLimit && activePreset.isScheduled) {
              console.log(`[PRESETS] HomeScreen startBlocking — NOTE: preset has noTimeLimit=true BUT isScheduled=true, so noTimeLimit is OVERRIDDEN to false for native module`);
            }

            await BlockingModule.startBlocking({
              mode: activePreset.mode,
              selectedApps: activePreset.selectedApps,
              blockedWebsites: activePreset.blockedWebsites,
              timerDays: activePreset.timerDays,
              timerHours: activePreset.timerHours,
              timerMinutes: activePreset.timerMinutes,
              lockEndTimeMs: lockEndTimeMs,
              blockSettings: activePreset.blockSettings,
              noTimeLimit: resolvedNoTimeLimit,
              presetName: activePreset.name,
              presetId: activePreset.id,
              isScheduled: activePreset.isScheduled || false,
              strictMode: activePreset.strictMode ?? false,
              customBlockedText: activePreset.customBlockedText ?? '',
              customOverlayImage: activePreset.customOverlayImage ?? '',
              customRedirectUrl: activePreset.customRedirectUrl ?? '',
            });
            console.log('[OVERLAY] Manual startBlocking — customBlockedText:', activePreset.customBlockedText || '(none)', 'customOverlayImage:', activePreset.customOverlayImage || '(none)');
            console.log('[REDIRECT] startBlocking — customRedirectUrl:', activePreset.customRedirectUrl || '(none)');
          }

          invalidateUserCaches(email);
          console.log('[BLOCKING] Blocking session fully started — native + backend synced');
        } catch (err) {
          console.log('[BLOCKING] Backend/native sync FAILED:', err);
        } finally {
          optimisticLockGuardRef.current = false;
        }
      })();

    } catch (error) {
      console.log('[BLOCKING] handleBlockNow ERROR:', error);
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
        <LoadingSpinner size={s(48)} />
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
          {/* Notification Permission Toggle */}
          <HeaderIconButton onPress={openNotificationSettings}>
            {notificationsEnabled ? (
              <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="#FFFFFF">
                <Path d="M19 12.59V10c0-3.22-2.18-5.93-5.14-6.74C13.57 2.52 12.85 2 12 2s-1.56.52-1.86 1.26C7.18 4.08 5 6.79 5 10v2.59L3.29 14.3a1 1 0 0 0-.29.71v2c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-2c0-.27-.11-.52-.29-.71zM5.64 3.3 4.23 1.89A10.9 10.9 0 0 0 1 9.67h2c0-2.4.94-4.66 2.64-6.36Zm12.72 0C20.06 5 21 7.26 21 9.66h2c0-2.94-1.14-5.7-3.22-7.78l-1.41 1.41ZM12 22c1.31 0 2.41-.83 2.82-2H9.18c.41 1.17 1.51 2 2.82 2" />
              </Svg>
            ) : (
              <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill={colors.textMuted}>
                <Path d="M12 22c1.31 0 2.41-.83 2.82-2H9.18c.41 1.17 1.51 2 2.82 2m8-4c.55 0 1-.45 1-1v-2c0-.27-.11-.52-.29-.71L19 12.58V9.99c0-3.22-2.18-5.93-5.14-6.74-.29-.74-1.01-1.26-1.86-1.26s-1.56.52-1.86 1.26a6.93 6.93 0 0 0-3.36 2.12L2.71 1.29 1.3 2.7l20 20 1.41-1.41L19.42 18h.59ZM5.06 9.3c-.02.23-.06.46-.06.7v2.59L3.29 14.3a1 1 0 0 0-.29.71v2c0 .55.45 1 1 1h9.76z" />
              </Svg>
            )}
          </HeaderIconButton>

          {/* Widget Bubble Toggle */}
          <HeaderIconButton onPress={toggleWidgetBubble}>
            <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill={widgetBubbleDisabled ? colors.textMuted : '#FFFFFF'}>
              <Path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2M8.5 8c.83 0 1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8M7 16l2.5-3 1.5 1.5 3-3.5 3 5z" />
            </Svg>
          </HeaderIconButton>

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
            progressViewOffset={-20}
          />
        }
      >
        {/* Status + Preset + Scheduled - centered in full screen */}
        <View className="flex-1 items-center justify-center" style={{ paddingTop: 40 }}>
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
              <Pressable
                onPress={() => { setScheduledPresetsModalVisible(true); }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                className="px-5 py-2.5 flex-row items-center"
                style={{
                  backgroundColor: colors.card,
                  position: 'absolute',
                  top: '100%',
                  marginTop: s(16),
                  borderWidth: 1, borderColor: colors.border, borderRadius: 9999, overflow: 'hidden', ...shadow.card,
                }}
              >
                {/* Status clock icon */}
                <View style={{ marginRight: s(8) }}>
                  <AlarmIcon size={s(14)} color={scheduledDotColor} />
                </View>
                <Text style={{ color: colors.text }} className={`${textSize.extraSmall} ${fontFamily.semibold}`}>
                  {scheduledPresets.length} Scheduled
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Button - outside ScrollView so RefreshControl can't steal gestures */}
      <View
        className="mb-10 px-6"
        style={{ position: 'relative' }}
      >
        {/* Lock/unlock icon — slides up on lock/unlock, then fades out */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            alignItems: 'center',
            marginBottom: s(16),
            opacity: lockIconOpacity,
            transform: [{ scale: lockIconScale }, { translateY: lockIconTranslateY }],
          }}
        >
          {lastLockAction === 'lock' ? (
            <LockIcon size={s(28)} color={colors.text} weight="fill" />
          ) : (
            <LockOpenIcon size={s(28)} color={colors.text} weight="fill" />
          )}
        </Animated.View>
        <BlockNowButton
          onActivate={handleBlockNow}
          onUnlockPress={handleUnlockPress}
          onSlideUnlock={handleSlideUnlock}
          disabled={!currentPreset}
          isLocked={isLocked}
          hasActiveTimer={!!timeRemaining}
          strictMode={activePreset?.strictMode ?? false}
          allowEmergencyTapout={activePreset?.allowEmergencyTapout ?? false}
        />
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
                          <AlarmIcon size={14} color={isCurrentlyActive ? colors.green : colors.yellow} />
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
              <Pressable
                onPress={() => { setScheduledPresetsModalVisible(false); }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                className="py-4 items-center justify-center"
              >
                <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

export default memo(HomeScreen);
