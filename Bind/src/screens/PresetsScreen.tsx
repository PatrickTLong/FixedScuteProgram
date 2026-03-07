import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  NativeModules,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PlusIcon as PhosphorPlusIcon, PlusCircleIcon } from 'phosphor-react-native';
import PresetsIcon from '../components/PresetsIcon';
import HeaderIconButton from '../components/HeaderIconButton';
import PresetCard, { Preset } from '../components/PresetCard';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  savePreset,
  deletePreset as deletePresetApi,
  activatePreset,
  invalidateUserCaches,
} from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/types';
import { usePresetSave } from '../navigation/PresetsStack';
import { useAuth } from '../context/AuthContext';

const { InstalledAppsModule, ScheduleModule } = NativeModules;

const PlusIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <PhosphorPlusIcon size={size} color={color} weight="fill" />
);

const TrashIcon = ({ color = '#FFFFFF', size = iconSize.forTabs }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M11.67 19.1a1.68 1.68 0 0 1 0 -2.51l4.86 -4.35a2.22 2.22 0 0 1 1.47 -0.57h0.5l0.5 -5.23a0.53 0.53 0 0 0 -0.13 -0.38 0.52 0.52 0 0 0 -0.37 -0.16H11L2.21 7.76l1.23 14.6A1.89 1.89 0 0 0 5.37 24h10.32a2 2 0 0 0 1.16 -0.37 2.43 2.43 0 0 1 -0.32 -0.24Z" />
    <Path d="M7 5.41 13.75 4l5.92 -1.26 0.15 0a0.74 0.74 0 0 0 -0.15 -1.47 0.85 0.85 0 0 0 -0.16 0l-5.34 1.08 -0.17 -0.62a2.15 2.15 0 0 0 -0.88 -1.34 2.13 2.13 0 0 0 -1.61 -0.3L7.46 1a2.14 2.14 0 0 0 -1.65 2.48l0.13 0.62L0.75 5.2l-0.16 0a0.75 0.75 0 0 0 -0.59 0.92 0.74 0.74 0 0 0 0.73 0.6l0.16 0Zm0.32 -2.24a0.64 0.64 0 0 1 0.49 -0.75l4.05 -0.86 -0.19 -0.74 0.15 0.74a0.62 0.62 0 0 1 0.48 0.08 0.64 0.64 0 0 1 0.27 0.41l0.13 0.61 -5.29 1.13Z" />
    <Path d="M24 20.47a3.41 3.41 0 0 0 -3.38 -3.38H18v-2.7a0.75 0.75 0 0 0 -1.26 -0.56L13 17.29a0.55 0.55 0 0 0 -0.13 0.18l0 0.06a0.82 0.82 0 0 0 -0.07 0.3 0.73 0.73 0 0 0 0.07 0.3l0 0.06a0.46 0.46 0 0 0 0.13 0.18l3.78 3.45a0.74 0.74 0 0 0 0.51 0.2 0.8 0.8 0 0 0 0.3 -0.06 0.76 0.76 0 0 0 0.41 -0.66v-2.71h2.6a1.88 1.88 0 0 1 0 3.76 0.75 0.75 0 1 0 0 1.5 3.33 3.33 0 0 0 2.24 -0.85A3.38 3.38 0 0 0 24 20.47Z" />
  </Svg>
);

// Pure function - check if two date ranges overlap
function dateRangesOverlap(
  start1: string | null | undefined,
  end1: string | null | undefined,
  start2: string | null | undefined,
  end2: string | null | undefined
): boolean {
  if (!start1 || !end1 || !start2 || !end2) return false;
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
}

// Cache installed apps for the session (apps don't change often)
// Note: iOS doesn't provide app list, only Android
let cachedInstalledApps: { id: string }[] | null = null;

async function getInstalledAppsCached(): Promise<{ id: string }[]> {
  // iOS doesn't provide a list of installed apps - skip this check
  if (Platform.OS === 'ios') return [];

  if (cachedInstalledApps) return cachedInstalledApps;
  if (!InstalledAppsModule) return [];
  try {
    const apps = await InstalledAppsModule.getInstalledApps();
    cachedInstalledApps = apps;
    return apps;
  } catch (e) {
    return [];
  }
}

function PresetsScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { userEmail, sharedPresets, setSharedPresets, sharedIsLocked, refreshPresets, refreshLockStatus, showModal } = useAuth();
  const userEmail_safe = userEmail || '';
  const { setOnSave, setEditingPreset: setContextEditingPreset, setExistingPresets, setEmail, setFinalSettingsState } = usePresetSave();

  // Read directly from shared state (single source of truth in AuthContext)
  const presets = sharedPresets;
  const setPresets = setSharedPresets;

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true); // Start true to prevent flash of content
  const [showSpinner, setShowSpinner] = useState(false); // Only show spinner after delay
  const [lockChecked, setLockChecked] = useState(false);
  const [overlapModalVisible, setOverlapModalVisible] = useState(false);
  const [overlapPresetName, setOverlapPresetName] = useState<string>('');
  const [overlapIsTimedVsScheduled, setOverlapIsTimedVsScheduled] = useState(false);

  // Verification modal for enabling scheduled presets
  const [scheduleVerifyModalVisible, setScheduleVerifyModalVisible] = useState(false);
  const [pendingScheduledPreset, setPendingScheduledPreset] = useState<Preset | null>(null);

  // Locked modal - shown when user tries to toggle/edit active presets while locked
  const [lockedModalVisible, setLockedModalVisible] = useState(false);
  const [lockedModalTitle, setLockedModalTitle] = useState('');
  const [lockedModalMessage, setLockedModalMessage] = useState('');

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // "Preset Saved" toast state
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastOpacity = useRef(new Animated.Value(0)).current;

  const isReturningFromEdit = useRef(false);

  // Mark when navigating to edit screens
  const handleAddPresetWithFlag = useCallback(() => {
    isReturningFromEdit.current = true;
    setContextEditingPreset(null);
    setFinalSettingsState(null);
    setExistingPresets(presets);
    setEmail(userEmail_safe);
    navigation.getParent()?.navigate('EditPresetApps');
  }, [presets, userEmail_safe, navigation, setContextEditingPreset, setFinalSettingsState, setExistingPresets, setEmail]);

  const handleEditPresetWithFlag = useCallback((preset: Preset) => {
    // Block editing active presets while locked
    if (sharedIsLocked && preset.isActive) {
      setLockedModalTitle('Preset Active');
      setLockedModalMessage("This preset can't be edited while it's actively blocking.");
      setLockedModalVisible(true);
      return;
    }
    isReturningFromEdit.current = true;
    setContextEditingPreset(preset);
    setFinalSettingsState(null);
    setExistingPresets(presets);
    setEmail(userEmail_safe);
    navigation.getParent()?.navigate('EditPresetApps');
  }, [presets, userEmail_safe, navigation, setContextEditingPreset, setFinalSettingsState, setExistingPresets, setEmail, sharedIsLocked]);

  // Background orphan cleanup - doesn't block UI
  const runOrphanCleanup = useCallback(async (fetchedPresets: Preset[]) => {
    try {
      const apps = await getInstalledAppsCached();
      const installedAppIds = new Set(apps.map((app: { id: string }) => app.id));

      if (installedAppIds.size === 0) return;

      const presetsToDelete: string[] = [];
      const validPresets: Preset[] = [];

      for (const preset of fetchedPresets) {
        if (preset.mode === 'specific') {
          const installedSelectedApps = preset.selectedApps.filter(id => installedAppIds.has(id));
          if (installedSelectedApps.length === 0 && preset.blockedWebsites.length === 0) {
            presetsToDelete.push(preset.id);
          } else {
            validPresets.push(preset);
          }
        } else {
          validPresets.push(preset);
        }
      }

      // If orphans found, delete them and update UI
      if (presetsToDelete.length > 0) {
        for (const presetId of presetsToDelete) {
          await deletePresetApi(userEmail_safe, presetId);
        }
        // Update UI after cleanup
        setPresets(validPresets);
      }
    } catch (e) {
      // Could not run orphan cleanup
    }
  }, [userEmail_safe]);

  // Check lock status and load presets in parallel on initial mount
  useEffect(() => {
    let spinnerTimeout: NodeJS.Timeout;

    async function init() {
      setLoading(true);
      // Only show spinner if loading takes more than 50ms (avoids flash)
      spinnerTimeout = setTimeout(() => setShowSpinner(true), 50);

      // Fetch via AuthContext (single source of truth)
      const [, fetchedPresets] = await Promise.all([refreshLockStatus(), refreshPresets()]);

      // Find active NON-SCHEDULED preset
      const activeNonScheduled = fetchedPresets.find(p => p.isActive && !p.isScheduled);
      setActivePresetId(activeNonScheduled?.id || null);

      // Sync scheduled presets to native (non-blocking)
      const scheduledPresets = fetchedPresets.filter(p => p.isScheduled && p.isActive);
      if (scheduledPresets.length > 0) {
        ScheduleModule?.saveScheduledPresets(JSON.stringify(scheduledPresets))
          .catch(() => { /* Failed to sync scheduled presets on load */ });
      }

      // Run orphan cleanup in background (non-blocking)
      runOrphanCleanup(fetchedPresets);

      setLockChecked(true);
      clearTimeout(spinnerTimeout);
      setShowSpinner(false);
      setLoading(false);
    }
    init();

    return () => {
      clearTimeout(spinnerTimeout);
    };
  }, [refreshLockStatus, refreshPresets, userEmail_safe, runOrphanCleanup]);

  // Note: Expiration checking is handled globally in AuthContext
  useFocusEffect(useCallback(() => {}, []));

  // Sync activePresetId when sharedPresets changes externally (e.g. HomeScreen overrides
  // a no-time-limit preset for a scheduled one). Without this, the toggle stays visually ON
  // because it reads from activePresetId, not preset.isActive.
  useEffect(() => {
    const activeNonScheduled = presets.find(p => !p.isScheduled && p.isActive);
    const newId = activeNonScheduled?.id ?? null;
    if (newId !== activePresetId) {
      console.log(`[PRESETS] activePresetId sync — sharedPresets changed, updating activePresetId: "${activePresetId}" → "${newId}" (preset: ${activeNonScheduled ? `"${activeNonScheduled.name}" noTimeLimit: ${activeNonScheduled.noTimeLimit}` : 'none'})`);
    }
    setActivePresetId(newId);
  }, [presets]);

  // Disable interactions until lock status is checked
  const isDisabled = !lockChecked;


  // Sync all scheduled presets to native module for background activation
  const syncScheduledPresetsToNative = useCallback(async (allPresets: Preset[]) => {
    try {
      // Filter to only scheduled presets that are active (toggled on)
      const scheduledPresets = allPresets.filter(p => p.isScheduled && p.isActive);
      console.log(`[PRESETS] syncScheduledPresetsToNative — ${scheduledPresets.length} active scheduled preset(s) to sync:`, scheduledPresets.map(p => ({ id: p.id, name: p.name, start: p.scheduleStartDate, end: p.scheduleEndDate, recurring: p.repeat_enabled })));
      const presetsJson = JSON.stringify(scheduledPresets);
      await ScheduleModule?.saveScheduledPresets(presetsJson);
      console.log('[PRESETS] syncScheduledPresetsToNative — native sync complete');
    } catch (e) {
      console.log('[PRESETS] syncScheduledPresetsToNative — FAILED:', e);
    }
  }, []);

  // Actually enable a scheduled preset (called after verification)
  const enableScheduledPreset = useCallback(async (preset: Preset) => {
    console.log(`[PRESETS] enableScheduledPreset — enabling "${preset.name}" (id: ${preset.id}, recurring: ${preset.repeat_enabled}, start: ${preset.scheduleStartDate}, end: ${preset.scheduleEndDate})`);

    // Check if there's a currently active non-scheduled preset (e.g. no-time-limit)
    const activeNonScheduled = presets.find(p => !p.isScheduled && p.isActive);
    if (activeNonScheduled) {
      console.log(`[PRESETS] enableScheduledPreset — NOTE: non-scheduled preset "${activeNonScheduled.name}" (id: ${activeNonScheduled.id}, noTimeLimit: ${activeNonScheduled.noTimeLimit}) is currently active — it will NOT be cancelled by enabling this scheduled preset`);
    } else {
      console.log('[PRESETS] enableScheduledPreset — no active non-scheduled preset currently');
    }

    // OPTIMISTIC UPDATE - update UI immediately
    setPresets(prev => prev.map(p =>
      p.id === preset.id ? { ...p, isActive: true } : p
    ));

    // Save in background - revert on error
    const presetToSave = { ...preset, isActive: true };
    savePreset(userEmail_safe, presetToSave).then(async result => {
      if (result.success) {
        console.log(`[PRESETS] enableScheduledPreset — save SUCCESS for "${preset.name}"`);
        // Invalidate cache so other screens get fresh data
        invalidateUserCaches(userEmail_safe);
        // Sync all scheduled presets to native for background activation
        const updatedPresets = presets.map(p =>
          p.id === preset.id ? { ...p, isActive: true } : p
        );
        await syncScheduledPresetsToNative(updatedPresets);
      } else {
        console.log(`[PRESETS] enableScheduledPreset — save FAILED for "${preset.name}", reverting`);
        // Revert on error
        setPresets(prev => prev.map(p =>
          p.id === preset.id ? { ...p, isActive: false } : p
        ));
        showModal('Connection Error', 'Could not save changes. Please check your connection.');
      }
    });
  }, [userEmail_safe, presets, syncScheduledPresetsToNative, showModal]);

  // Handle verification modal confirm for scheduled presets
  const handleScheduleVerifyConfirm = useCallback(() => {
    if (pendingScheduledPreset) {
      console.log(`[PRESETS] handleScheduleVerifyConfirm — user CONFIRMED enabling scheduled preset "${pendingScheduledPreset.name}" (recurring: ${pendingScheduledPreset.repeat_enabled})`);
      enableScheduledPreset(pendingScheduledPreset);
    }
    setScheduleVerifyModalVisible(false);
    setPendingScheduledPreset(null);
  }, [pendingScheduledPreset, enableScheduledPreset]);

  // Handle verification modal cancel for scheduled presets
  const handleScheduleVerifyCancel = useCallback(() => {
    console.log(`[PRESETS] handleScheduleVerifyCancel — user CANCELLED enabling scheduled preset "${pendingScheduledPreset?.name}"`);
    setScheduleVerifyModalVisible(false);
    setPendingScheduledPreset(null);
  }, []);


  const handleTogglePreset = useCallback(async (preset: Preset, value: boolean) => {
    console.log(`[PRESETS] handleTogglePreset — "${preset.name}" (id: ${preset.id}) toggled to ${value ? 'ON' : 'OFF'} | isScheduled: ${preset.isScheduled}, noTimeLimit: ${preset.noTimeLimit}, recurring: ${preset.repeat_enabled}`);

    // Block all toggles while locked
    if (sharedIsLocked) {
      console.log('[PRESETS] handleTogglePreset — BLOCKED: presets are locked (blocking active)');
      setLockedModalTitle('Presets Locked');
      setLockedModalMessage("You can't toggle presets while blocking is active.");
      setLockedModalVisible(true);
      return;
    }
    if (value) {
      // Log current state of all presets for context
      const activeNonScheduled = presets.find(p => !p.isScheduled && p.isActive);
      const activeScheduled = presets.filter(p => p.isScheduled && p.isActive);
      console.log(`[PRESETS] handleTogglePreset — ACTIVATING | current state: activeNonScheduled=${activeNonScheduled ? `"${activeNonScheduled.name}" (noTimeLimit: ${activeNonScheduled.noTimeLimit})` : 'none'}, activeScheduled=[${activeScheduled.map(p => `"${p.name}"`).join(', ')}]`);

      if (preset.isScheduled) {
        console.log(`[PRESETS] handleTogglePreset — activating SCHEDULED preset "${preset.name}" (recurring: ${preset.repeat_enabled}, start: ${preset.scheduleStartDate}, end: ${preset.scheduleEndDate})`);
        // Scheduled preset - check for overlaps with other active scheduled presets
        const otherScheduledPresets = presets.filter(
          p => p.isScheduled && p.isActive && p.id !== preset.id
        );
        console.log(`[PRESETS] handleTogglePreset — checking overlap with ${otherScheduledPresets.length} other active scheduled preset(s)`);

        for (const other of otherScheduledPresets) {
          if (dateRangesOverlap(
            preset.scheduleStartDate,
            preset.scheduleEndDate,
            other.scheduleStartDate,
            other.scheduleEndDate
          )) {
            console.log(`[PRESETS] handleTogglePreset — OVERLAP DETECTED: "${preset.name}" overlaps with scheduled preset "${other.name}" — blocking activation`);
            // Show error - dates overlap
            setOverlapPresetName(other.name);
            setOverlapIsTimedVsScheduled(false);
            setOverlapModalVisible(true);
            return; // Don't activate
          }
        }

        if (activeNonScheduled) {
          console.log(`[PRESETS] handleTogglePreset — NOTE: enabling scheduled preset while non-scheduled preset "${activeNonScheduled.name}" (noTimeLimit: ${activeNonScheduled.noTimeLimit}) is active — the non-scheduled preset will NOT be cancelled`);
        }

        // Show verification modal before enabling scheduled preset
        console.log(`[PRESETS] handleTogglePreset — no overlaps, showing verification modal for scheduled preset "${preset.name}"`);
        setPendingScheduledPreset(preset);
        setScheduleVerifyModalVisible(true);
      } else {
        // Non-scheduled preset - only one can be active
        console.log(`[PRESETS] handleTogglePreset — activating NON-SCHEDULED preset "${preset.name}" (noTimeLimit: ${preset.noTimeLimit})`);

        // If this is a TIMED preset (not no-time-limit), check for overlap with active scheduled presets
        if (!preset.noTimeLimit) {
          console.log(`[PRESETS] handleTogglePreset — preset is TIMED (has time limit), checking overlap with active scheduled presets`);
          // Calculate end time for this timed preset
          const now = new Date();
          let presetEndTime: Date | null = null;

          if (preset.targetDate) {
            presetEndTime = new Date(preset.targetDate);
            console.log(`[PRESETS] handleTogglePreset — timed preset uses targetDate: ${preset.targetDate}`);
          } else {
            // Calculate from timer values
            const totalMs =
              (preset.timerDays * 24 * 60 * 60 * 1000) +
              (preset.timerHours * 60 * 60 * 1000) +
              (preset.timerMinutes * 60 * 1000) +
              (preset.timerSeconds * 1000);
            if (totalMs > 0) {
              presetEndTime = new Date(now.getTime() + totalMs);
              console.log(`[PRESETS] handleTogglePreset — timed preset duration: ${preset.timerDays}d ${preset.timerHours}h ${preset.timerMinutes}m ${preset.timerSeconds}s (${totalMs}ms), calculated end: ${presetEndTime.toISOString()}`);
            }
          }

          if (presetEndTime) {
            // Check if this timed preset overlaps with any active scheduled preset
            const activeScheduledPresets = presets.filter(p => p.isScheduled && p.isActive);
            console.log(`[PRESETS] handleTogglePreset — checking timed preset overlap with ${activeScheduledPresets.length} active scheduled preset(s)`);

            for (const scheduled of activeScheduledPresets) {
              if (dateRangesOverlap(
                now.toISOString(),
                presetEndTime.toISOString(),
                scheduled.scheduleStartDate,
                scheduled.scheduleEndDate
              )) {
                console.log(`[PRESETS] handleTogglePreset — OVERLAP DETECTED: timed preset "${preset.name}" (ends ${presetEndTime.toISOString()}) overlaps with scheduled preset "${scheduled.name}" (${scheduled.scheduleStartDate} - ${scheduled.scheduleEndDate}) — blocking activation`);
                // Show overlap modal
                setOverlapPresetName(scheduled.name);
                setOverlapIsTimedVsScheduled(true);
                setOverlapModalVisible(true);
                return; // Don't activate
              }
            }
            console.log('[PRESETS] handleTogglePreset — no overlaps found with scheduled presets');
          }
        } else {
          console.log(`[PRESETS] handleTogglePreset — preset is NO-TIME-LIMIT — SKIPPING overlap check with scheduled presets (no-time-limit presets bypass this check)`);
          const activeScheduledPresets = presets.filter(p => p.isScheduled && p.isActive);
          if (activeScheduledPresets.length > 0) {
            console.log(`[PRESETS] handleTogglePreset — WARNING: activating no-time-limit preset "${preset.name}" while ${activeScheduledPresets.length} scheduled preset(s) are active: [${activeScheduledPresets.map(p => `"${p.name}"`).join(', ')}] — no overlap check performed`);
          }
        }

        // Check if another non-scheduled preset will be deactivated
        if (activeNonScheduled && activeNonScheduled.id !== preset.id) {
          console.log(`[PRESETS] handleTogglePreset — DEACTIVATING previous non-scheduled preset "${activeNonScheduled.name}" (noTimeLimit: ${activeNonScheduled.noTimeLimit}) — replaced by "${preset.name}"`);
        }

        // OPTIMISTIC UPDATE - update UI immediately
        console.log(`[PRESETS] handleTogglePreset — optimistic UI update: setting "${preset.name}" as active, deactivating all other non-scheduled presets (scheduled presets preserved)`);
        setActivePresetId(preset.id);
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : p.id === preset.id,
        })));

        // Save in background
        activatePreset(userEmail_safe, preset.id).then(async result => {
          if (result.success) {
            console.log(`[PRESETS] handleTogglePreset — activatePreset API SUCCESS for "${preset.name}"`);
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
          } else {
            console.log(`[PRESETS] handleTogglePreset — activatePreset API FAILED for "${preset.name}", reverting`);
            // Revert on error
            setActivePresetId(null);
            setPresets(prev => prev.map(p => ({
              ...p,
              isActive: p.isScheduled ? p.isActive : false,
            })));
            showModal('Connection Error', 'Could not save changes. Please check your connection.');
          }
        });
      }
    } else {
      // Deactivate
      if (preset.isScheduled) {
        console.log(`[PRESETS] handleTogglePreset — DEACTIVATING scheduled preset "${preset.name}" (recurring: ${preset.repeat_enabled})`);
        // OPTIMISTIC UPDATE - update UI immediately
        setPresets(prev => prev.map(p =>
          p.id === preset.id ? { ...p, isActive: false } : p
        ));

        // Save in background - revert on error
        const presetToSave = { ...preset, isActive: false };
        savePreset(userEmail_safe, presetToSave).then(async result => {
          if (result.success) {
            console.log(`[PRESETS] handleTogglePreset — deactivate scheduled preset "${preset.name}" save SUCCESS`);
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
            // Sync all scheduled presets to native (with this one now deactivated)
            const updatedPresets = presets.map(p =>
              p.id === preset.id ? { ...p, isActive: false } : p
            );
            await syncScheduledPresetsToNative(updatedPresets);
          } else {
            console.log(`[PRESETS] handleTogglePreset — deactivate scheduled preset "${preset.name}" save FAILED, reverting`);
            // Revert on error
            setPresets(prev => prev.map(p =>
              p.id === preset.id ? { ...p, isActive: true } : p
            ));
            showModal('Connection Error', 'Could not save changes. Please check your connection.');
          }
        });
      } else {
        // Non-scheduled preset
        console.log(`[PRESETS] handleTogglePreset — DEACTIVATING non-scheduled preset "${preset.name}" (noTimeLimit: ${preset.noTimeLimit})`);
        // OPTIMISTIC UPDATE - update UI immediately
        setActivePresetId(null);
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : false,
        })));

        // Save in background
        console.log('[PRESETS] handleTogglePreset — calling activatePreset(null) to deactivate all non-scheduled presets');
        activatePreset(userEmail_safe, null).then(result => {
          if (result.success) {
            console.log('[PRESETS] handleTogglePreset — deactivate non-scheduled preset API SUCCESS');
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
          } else {
            console.log(`[PRESETS] handleTogglePreset — deactivate non-scheduled preset API FAILED, reverting "${preset.name}" to active`);
            // Revert on error - re-activate this preset
            setActivePresetId(preset.id);
            setPresets(prev => prev.map(p => ({
              ...p,
              isActive: p.isScheduled ? p.isActive : p.id === preset.id,
            })));
            showModal('Connection Error', 'Could not save changes. Please check your connection.');
          }
        });
      }
    }
  }, [userEmail_safe, syncScheduledPresetsToNative, presets, sharedIsLocked, showModal]);


  const handleLongPressPreset = useCallback((preset: Preset) => {
    if (haptics.longPressDelete.enabled) triggerHaptic(haptics.longPressDelete.type);
    // Block deleting active presets while locked
    if (sharedIsLocked && preset.isActive) {
      setLockedModalTitle('Preset Active');
      setLockedModalMessage("This preset can't be deleted while it's actively blocking.");
      setLockedModalVisible(true);
      return;
    }
    setPresetToDelete(preset);
    setDeleteModalVisible(true);
  }, [sharedIsLocked]);

  const handleDeletePreset = useCallback(async () => {
    if (!presetToDelete) return;

    const presetId = presetToDelete.id;
    const wasScheduled = presetToDelete.isScheduled;
    const wasActiveNonScheduled = !presetToDelete.isScheduled && activePresetId === presetId;

    // OPTIMISTIC UPDATE - update UI immediately
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);

    if (wasActiveNonScheduled) {
      setActivePresetId(null);
    }

    // Close modal immediately for responsive feel
    setDeleteModalVisible(false);
    setPresetToDelete(null);

    // Delete in background - revert on error
    deletePresetApi(userEmail_safe, presetId).then(async result => {
      if (result.success) {
        // If deleting an active non-scheduled preset, clear active
        if (wasActiveNonScheduled) {
          await activatePreset(userEmail_safe, null);
        }

        // If deleting a scheduled preset, sync to native
        if (wasScheduled) {
          await syncScheduledPresetsToNative(updatedPresets);
        }
      } else {
        // Revert on error - add preset back
        setPresets(prev => [...prev, presetToDelete]);
        if (wasActiveNonScheduled) {
          setActivePresetId(presetId);
        }
        showModal('Connection Error', 'Could not delete preset. Please check your connection.');
      }
    });
  }, [presetToDelete, userEmail_safe, activePresetId, presets, syncScheduledPresetsToNative, showModal]);

  // Show "Preset Saved" toast with fade animation
  const showSavedToastAnimation = useCallback(() => {
    setShowSavedToast(true);
    savedToastOpacity.setValue(1);
    Animated.timing(savedToastOpacity, {
      toValue: 0,
      duration: 1000,
      delay: 0,
      useNativeDriver: true,
    }).start(() => {
      setShowSavedToast(false);
    });
  }, [savedToastOpacity]);

  const handleSavePreset = useCallback(async (preset: Preset) => {
    console.log(`[PRESETS] handleSavePreset — saving "${preset.name}" (isScheduled: ${preset.isScheduled}, noTimeLimit: ${preset.noTimeLimit}, recurring: ${preset.repeat_enabled})`);
    // Show "Preset Saved" toast immediately
    showSavedToastAnimation();

    const editingPreset = presets.find(p => p.id === preset.id) || null;
    const isEditing = !!editingPreset;
    console.log(`[PRESETS] handleSavePreset — ${isEditing ? 'EDITING existing' : 'CREATING new'} preset`);

    let presetToSave: Preset;

    if (isEditing && editingPreset) {
      presetToSave = {
        ...preset,
        id: editingPreset.id,
        isActive: editingPreset.isActive,
        isDefault: editingPreset.isDefault,
      };

      if (presetToSave.isScheduled && presetToSave.isActive) {
        console.log(`[PRESETS] handleSavePreset — editing active scheduled preset, checking for overlap with other scheduled presets`);
        const otherActiveScheduled = presets.filter(
          p => p.isScheduled && p.isActive && p.id !== presetToSave.id
        );

        for (const other of otherActiveScheduled) {
          if (dateRangesOverlap(
            presetToSave.scheduleStartDate,
            presetToSave.scheduleEndDate,
            other.scheduleStartDate,
            other.scheduleEndDate
          )) {
            console.log(`[PRESETS] handleSavePreset — OVERLAP DETECTED with "${other.name}" — auto-deactivating edited preset`);
            presetToSave = { ...presetToSave, isActive: false };
            break;
          }
        }
      }
    } else {
      presetToSave = {
        ...preset,
        id: `preset-${Date.now()}`,
        isActive: false,
        isDefault: false,
      };
      console.log(`[PRESETS] handleSavePreset — new preset assigned id: ${presetToSave.id}`);
    }

    // Optimistic update — show the preset in the list immediately
    const previousPresets = presets;
    if (isEditing) {
      setPresets(prev => prev.map(p => (p.id === presetToSave.id ? presetToSave : p)));
    } else {
      setPresets(prev => [...prev, presetToSave]);
    }

    // Background: cancel old alarms, save to API, sync schedules
    try {
      if (isEditing && editingPreset?.isScheduled) {
        console.log(`[PRESETS] handleSavePreset — cancelling old alarm for edited scheduled preset "${editingPreset.name}"`);
        try { await ScheduleModule?.cancelPresetAlarm(editingPreset.id); } catch (_) {}
      }

      const result = await savePreset(userEmail_safe, presetToSave);

      if (result.success) {
        console.log(`[PRESETS] handleSavePreset — save API SUCCESS for "${presetToSave.name}"`);
        invalidateUserCaches(userEmail_safe);

        if (isEditing && presetToSave.isActive && !presetToSave.isScheduled) {
          console.log(`[PRESETS] handleSavePreset — re-activating edited active non-scheduled preset "${presetToSave.name}"`);
          await activatePreset(userEmail_safe, presetToSave.id);
        }

        const latestPresets = isEditing
          ? previousPresets.map(p => (p.id === presetToSave.id ? presetToSave : p))
          : [...previousPresets, presetToSave];

        if (presetToSave.isScheduled) {
          console.log(`[PRESETS] handleSavePreset — preset is scheduled, syncing to native`);
          await syncScheduledPresetsToNative(latestPresets);
        }
      } else {
        console.log(`[PRESETS] handleSavePreset — save API FAILED for "${presetToSave.name}", reverting`);
        // Revert on failure
        setPresets(previousPresets);
        showModal('Connection Error', 'Could not save preset. Please check your connection.');
      }
    } catch (_) {
      console.log(`[PRESETS] handleSavePreset — save ERROR for "${presetToSave.name}", reverting`);
      // Revert on error
      setPresets(previousPresets);
      showModal('Connection Error', 'Could not save preset. Please check your connection.');
    }
  }, [userEmail_safe, syncScheduledPresetsToNative, presets, showSavedToastAnimation, showModal]);

  // Wire handleSavePreset into PresetSaveContext so child screens can call it
  useEffect(() => {
    setOnSave(handleSavePreset);
  }, [handleSavePreset, setOnSave]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setPresetToDelete(null);
  }, []);

  const handleCloseOverlapModal = useCallback(() => {
    setOverlapModalVisible(false);
  }, []);

  const handleExpiredPreset = useCallback(async (preset: Preset) => {
    console.log(`[PRESETS] handleExpiredPreset — preset "${preset.name}" (id: ${preset.id}) expired | isScheduled: ${preset.isScheduled}, noTimeLimit: ${preset.noTimeLimit}, recurring: ${preset.repeat_enabled}`);
    // Auto-deactivate expired preset
    if (preset.isScheduled) {
      console.log(`[PRESETS] handleExpiredPreset — SCHEDULED preset "${preset.name}" expired — marking as inactive and syncing to native`);
      // Scheduled preset expired - just mark it as inactive
      const updatedPresets = presets.map(p =>
        p.id === preset.id ? { ...p, isActive: false } : p
      );
      setPresets(updatedPresets);
      // Save to backend
      const presetToSave = { ...preset, isActive: false };
      savePreset(userEmail_safe, presetToSave).then(async () => {
        console.log(`[PRESETS] handleExpiredPreset — scheduled preset "${preset.name}" deactivation saved, syncing to native`);
        // Sync to native to cancel the alarm
        await syncScheduledPresetsToNative(updatedPresets);
      }).catch(() => {
        console.log(`[PRESETS] handleExpiredPreset — FAILED to save expired scheduled preset "${preset.name}"`);
      });
    } else if (activePresetId === preset.id) {
      console.log(`[PRESETS] handleExpiredPreset — NON-SCHEDULED preset "${preset.name}" expired (was active) — deactivating all non-scheduled presets (scheduled presets preserved)`);
      // Non-scheduled preset expired
      const activeScheduled = presets.filter(p => p.isScheduled && p.isActive);
      if (activeScheduled.length > 0) {
        console.log(`[PRESETS] handleExpiredPreset — NOTE: ${activeScheduled.length} scheduled preset(s) remain active after expiration: [${activeScheduled.map(p => `"${p.name}"`).join(', ')}]`);
      }
      const result = await activatePreset(userEmail_safe, null);
      if (result.success) {
        console.log(`[PRESETS] handleExpiredPreset — deactivation API SUCCESS for "${preset.name}"`);
        setActivePresetId(null);
        // Only set non-scheduled presets to inactive, preserve scheduled preset states
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : false,
        })));
      } else {
        console.log(`[PRESETS] handleExpiredPreset — deactivation API FAILED for "${preset.name}"`);
      }
    } else {
      console.log(`[PRESETS] handleExpiredPreset — preset "${preset.name}" expired but is not the active preset (activePresetId: ${activePresetId}) — no action taken`);
    }
  }, [activePresetId, userEmail_safe, presets, syncScheduledPresetsToNative]);

  // Keep refs to handlers so renderPresetItem stays stable
  const handleEditPresetRef = useRef(handleEditPresetWithFlag);
  handleEditPresetRef.current = handleEditPresetWithFlag;
  const handleLongPressPresetRef = useRef(handleLongPressPreset);
  handleLongPressPresetRef.current = handleLongPressPreset;
  const handleTogglePresetRef = useRef(handleTogglePreset);
  handleTogglePresetRef.current = handleTogglePreset;
  const handleExpiredPresetRef = useRef(handleExpiredPreset);
  handleExpiredPresetRef.current = handleExpiredPreset;
  const activePresetIdRef = useRef(activePresetId);
  activePresetIdRef.current = activePresetId;

  const renderPresetItem = useCallback(({ item: preset }: { item: Preset }) => {
    // For scheduled presets, use preset.isActive directly
    // For non-scheduled presets, use activePresetId
    const isPresetActive = preset.isScheduled ? preset.isActive : activePresetIdRef.current === preset.id;

    return (
      <PresetCard
        preset={preset}
        isActive={isPresetActive}
        onPress={() => handleEditPresetRef.current(preset)}
        onLongPress={() => handleLongPressPresetRef.current(preset)}
        onToggle={(value) => handleTogglePresetRef.current(preset, value)}
        disabled={isDisabled}
        onExpired={() => handleExpiredPresetRef.current(preset)}
      />
    );
  }, [isDisabled]);

  const keyExtractor = useCallback((item: Preset) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={{ alignItems: 'center', paddingTop: s(60), paddingHorizontal: s(32) }}>
      {!loading && (
        <>
          <PresetsIcon size={s(48)} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: s(12) }} className={`${textSize.small} ${fontFamily.regular}`}>
            No presets yet
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s(4) }}>
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>Tap </Text>
            <PlusCircleIcon size={s(14)} color={colors.textMuted} weight="fill" />
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}`}> to create one</Text>
          </View>
        </>
      )}
    </View>
  ), [loading, colors.textSecondary, colors.textMuted, s]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateUserCaches(userEmail_safe);
    await Promise.all([refreshLockStatus(true), refreshPresets(true)]);
    setRefreshing(false);
  }, [userEmail_safe, refreshLockStatus, refreshPresets]);

  // Show loading state until initial data is loaded - prevents flash of incomplete content
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        {showSpinner && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner size={s(48)} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Presets</Text>
        </View>

        {/* Add Button - stays green but disabled when locked */}
          <HeaderIconButton onPress={handleAddPresetWithFlag} disabled={isDisabled}>
            <PlusCircleIcon size={s(iconSize.headerNav)} color="#fff" weight="fill" />
          </HeaderIconButton>
      </View>

      {/* Presets List */}
      <FlatList
        className="flex-1"
        data={presets}
        renderItem={renderPresetItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ paddingHorizontal: s(20), paddingTop: s(12), paddingBottom: s(32) }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
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
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Preset"
        message={`Are you sure you want to delete "${presetToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        icon={<TrashIcon color={colors.red} />}
        onConfirm={handleDeletePreset}
        onCancel={handleCloseDeleteModal}
      />

      {/* Schedule Overlap Modal */}
      <ConfirmationModal
        visible={overlapModalVisible}
        title={overlapIsTimedVsScheduled ? "Preset Overlap" : "Schedule Overlap"}
        message={overlapIsTimedVsScheduled
          ? `This preset's duration overlaps with the scheduled preset "${overlapPresetName}". Please disable the scheduled preset first or wait until it ends.`
          : `This schedule overlaps with "${overlapPresetName}". Please choose different dates or disable the other scheduled preset first.`}
        confirmText="OK"
        onConfirm={handleCloseOverlapModal}
        onCancel={handleCloseOverlapModal}
      />

      {/* Locked Modal - shown when trying to toggle/edit active presets while locked */}
      <ConfirmationModal
        visible={lockedModalVisible}
        title={lockedModalTitle}
        message={lockedModalMessage}
        confirmText="Dismiss"
        onConfirm={() => setLockedModalVisible(false)}
        onCancel={() => setLockedModalVisible(false)}
      />

      {/* Schedule Verification Modal */}
      <ConfirmationModal
        visible={scheduleVerifyModalVisible}
        title={pendingScheduledPreset?.repeat_enabled ? "Enable Recurring Schedule?" : "Enable Schedule?"}
        message={pendingScheduledPreset?.repeat_enabled
          ? `Do you want to enable the recurring preset "${pendingScheduledPreset?.name}"? It will automatically repeat on its set interval during its scheduled time.`
          : `Do you want to enable the scheduled preset "${pendingScheduledPreset?.name}"? It will automatically activate during its scheduled time.`}
        confirmText="Enable"
        cancelText="Cancel"
        onConfirm={handleScheduleVerifyConfirm}
        onCancel={handleScheduleVerifyCancel}
      />

      {/* Preset Saved Toast - positioned at true screen center */}
      {showSavedToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -insets.top,
            left: 0,
            right: 0,
            height: Dimensions.get('screen').height,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: savedToastOpacity,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.text}>
              <Path d="M5 21h14c1.1 0 2-.9 2-2V8c0-.27-.11-.52-.29-.71l-4-4A1 1 0 0 0 16 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2M7 5h4v2h2V5h2v4H7zm0 8c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6H7z" />
            </Svg>
            <Text style={{ color: colors.text, marginLeft: s(8) }} className={`${textSize.large} ${fontFamily.semibold}`}>
              Preset Saved
            </Text>
          </View>
        </Animated.View>
      )}

    </View>
  );
}

export default memo(PresetsScreen);
