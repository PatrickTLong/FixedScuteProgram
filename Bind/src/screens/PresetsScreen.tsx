import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  NativeModules,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PresetCard, { Preset } from '../components/PresetCard';
import PresetEditModal from '../components/PresetEditModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ActiveRecurringPresetModal from '../components/ActiveRecurringPresetModal';
import {
  getPresets,
  savePreset,
  deletePreset as deletePresetApi,
  activatePreset,
  getLockStatus,
  invalidateUserCaches,
} from '../services/cardApi';
import { useTheme } from '../context/ThemeContext';

const { InstalledAppsModule, ScheduleModule } = NativeModules;

// Cache installed apps for the session (apps don't change often)
let cachedInstalledApps: { id: string }[] | null = null;

async function getInstalledAppsCached(): Promise<{ id: string }[]> {
  if (cachedInstalledApps) return cachedInstalledApps;
  if (!InstalledAppsModule) return [];
  try {
    const apps = await InstalledAppsModule.getInstalledApps();
    cachedInstalledApps = apps;
    return apps;
  } catch (e) {
    console.log('[PresetsScreen] Could not get installed apps:', e);
    return [];
  }
}

interface Props {
  userEmail: string;
}

function PresetsScreen({ userEmail }: Props) {
  const { colors } = useTheme();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true); // Show inline spinner until first data loads
  const [isLocked, setIsLocked] = useState<boolean | null>(null); // null = loading
  const [lockChecked, setLockChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [overlapModalVisible, setOverlapModalVisible] = useState(false);
  const [overlapPresetName, setOverlapPresetName] = useState<string>('');

  // Verification modal for enabling scheduled presets
  const [scheduleVerifyModalVisible, setScheduleVerifyModalVisible] = useState(false);
  const [pendingScheduledPreset, setPendingScheduledPreset] = useState<Preset | null>(null);

  // Active recurring preset modal (prevents editing)
  const [activeRecurringModalVisible, setActiveRecurringModalVisible] = useState(false);


  const checkLockStatus = useCallback(async () => {
    const status = await getLockStatus(userEmail);
    setIsLocked(status.isLocked);
    setLockChecked(true);
  }, [userEmail]);

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
            console.log(`[PresetsScreen] Deleting orphaned preset "${preset.name}" - no installed apps`);
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
          await deletePresetApi(userEmail, presetId);
        }
        // Update UI after cleanup
        setPresets(validPresets);
      }
    } catch (e) {
      console.log('[PresetsScreen] Could not run orphan cleanup:', e);
    }
  }, [userEmail]);

  const loadPresets = useCallback(async (forceRefresh = false) => {
    try {
      // Fetch presets from Supabase - use cache unless force refresh
      const fetchedPresets = await getPresets(userEmail, forceRefresh);

      // Show presets immediately - don't wait for orphan cleanup
      setPresets(fetchedPresets);

      // Find active NON-SCHEDULED preset
      const activeNonScheduled = fetchedPresets.find(p => p.isActive && !p.isScheduled);
      setActivePresetId(activeNonScheduled?.id || null);

      // Sync scheduled presets to native (non-blocking)
      const scheduledPresets = fetchedPresets.filter(p => p.isScheduled && p.isActive);
      if (scheduledPresets.length > 0) {
        ScheduleModule?.saveScheduledPresets(JSON.stringify(scheduledPresets))
          .then(() => console.log('[PresetsScreen] Synced scheduled presets on load:', scheduledPresets.length))
          .catch((e: any) => console.error('[PresetsScreen] Failed to sync scheduled presets on load:', e));
      }

      // Run orphan cleanup in background (non-blocking)
      runOrphanCleanup(fetchedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, [userEmail, runOrphanCleanup]);

  // Check lock status and load presets in parallel on initial mount
  useEffect(() => {
    async function init() {
      // Load presets with cache on first render - HomeScreen handles cache invalidation on app restart
      await Promise.all([checkLockStatus(), loadPresets(false)]);
      setLoading(false);
    }
    init();
  }, [checkLockStatus, loadPresets, userEmail]);


  // Disable interactions until lock status is checked, or if locked
  const isDisabled = !lockChecked || isLocked === true;


  // Sync all scheduled presets to native module for background activation
  const syncScheduledPresetsToNative = useCallback(async (allPresets: Preset[]) => {
    try {
      // Filter to only scheduled presets that are active (toggled on)
      const scheduledPresets = allPresets.filter(p => p.isScheduled && p.isActive);
      const presetsJson = JSON.stringify(scheduledPresets);
      await ScheduleModule?.saveScheduledPresets(presetsJson);
      console.log('[PresetsScreen] Synced scheduled presets to native:', scheduledPresets.length);
    } catch (e) {
      console.error('[PresetsScreen] Failed to sync scheduled presets:', e);
    }
  }, []);

  // Check if two date ranges overlap
  const dateRangesOverlap = useCallback((
    start1: string | null | undefined,
    end1: string | null | undefined,
    start2: string | null | undefined,
    end2: string | null | undefined
  ): boolean => {
    if (!start1 || !end1 || !start2 || !end2) return false;
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();
    // Two ranges overlap if one starts before the other ends
    return s1 < e2 && s2 < e1;
  }, []);

  // Actually enable a scheduled preset (called after verification)
  const enableScheduledPreset = useCallback(async (preset: Preset) => {
    // OPTIMISTIC UPDATE - update UI immediately
    setPresets(prev => prev.map(p =>
      p.id === preset.id ? { ...p, isActive: true } : p
    ));

    // Save in background - revert on error
    const presetToSave = { ...preset, isActive: true };
    savePreset(userEmail, presetToSave).then(async result => {
      if (result.success) {
        // Invalidate cache so other screens get fresh data
        invalidateUserCaches(userEmail);
        // Sync all scheduled presets to native for background activation
        const updatedPresets = presets.map(p =>
          p.id === preset.id ? { ...p, isActive: true } : p
        );
        await syncScheduledPresetsToNative(updatedPresets);
      } else {
        // Revert on error
        setPresets(prev => prev.map(p =>
          p.id === preset.id ? { ...p, isActive: false } : p
        ));
        console.error('Failed to save preset:', result.error);
      }
    });
  }, [userEmail, presets, syncScheduledPresetsToNative]);

  // Handle verification modal confirm for scheduled presets
  const handleScheduleVerifyConfirm = useCallback(() => {
    if (pendingScheduledPreset) {
      enableScheduledPreset(pendingScheduledPreset);
    }
    setScheduleVerifyModalVisible(false);
    setPendingScheduledPreset(null);
  }, [pendingScheduledPreset, enableScheduledPreset]);

  // Handle verification modal cancel for scheduled presets
  const handleScheduleVerifyCancel = useCallback(() => {
    setScheduleVerifyModalVisible(false);
    setPendingScheduledPreset(null);
  }, []);

  const handleTogglePreset = useCallback(async (preset: Preset, value: boolean) => {
    if (value) {
      if (preset.isScheduled) {
        // Scheduled preset - check for overlaps with other active scheduled presets
        const otherScheduledPresets = presets.filter(
          p => p.isScheduled && p.isActive && p.id !== preset.id
        );

        for (const other of otherScheduledPresets) {
          if (dateRangesOverlap(
            preset.scheduleStartDate,
            preset.scheduleEndDate,
            other.scheduleStartDate,
            other.scheduleEndDate
          )) {
            // Show error - dates overlap
            setOverlapPresetName(other.name);
            setOverlapModalVisible(true);
            return; // Don't activate
          }
        }

        // Show verification modal before enabling scheduled preset
        setPendingScheduledPreset(preset);
        setScheduleVerifyModalVisible(true);
      } else {
        // Non-scheduled preset - only one can be active
        // If this is a TIMED preset (not no-time-limit), check for overlap with active scheduled presets
        if (!preset.noTimeLimit) {
          // Calculate end time for this timed preset
          const now = new Date();
          let presetEndTime: Date | null = null;

          if (preset.targetDate) {
            presetEndTime = new Date(preset.targetDate);
          } else {
            // Calculate from timer values
            const totalMs =
              (preset.timerDays * 24 * 60 * 60 * 1000) +
              (preset.timerHours * 60 * 60 * 1000) +
              (preset.timerMinutes * 60 * 1000) +
              (preset.timerSeconds * 1000);
            if (totalMs > 0) {
              presetEndTime = new Date(now.getTime() + totalMs);
            }
          }

          if (presetEndTime) {
            // Check if this timed preset overlaps with any active scheduled preset
            const activeScheduledPresets = presets.filter(p => p.isScheduled && p.isActive);

            for (const scheduled of activeScheduledPresets) {
              if (dateRangesOverlap(
                now.toISOString(),
                presetEndTime.toISOString(),
                scheduled.scheduleStartDate,
                scheduled.scheduleEndDate
              )) {
                // Show overlap modal
                setOverlapPresetName(scheduled.name);
                setOverlapModalVisible(true);
                return; // Don't activate
              }
            }
          }
        }

        // OPTIMISTIC UPDATE - update UI immediately
        setActivePresetId(preset.id);
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : p.id === preset.id,
        })));

        // Save in background
        activatePreset(userEmail, preset.id).then(async result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail);
          } else {
            // Revert on error
            setActivePresetId(null);
            setPresets(prev => prev.map(p => ({
              ...p,
              isActive: p.isScheduled ? p.isActive : false,
            })));
            console.error('Failed to activate preset:', result.error);
          }
        });
      }
    } else {
      // Deactivate
      if (preset.isScheduled) {
        // OPTIMISTIC UPDATE - update UI immediately
        setPresets(prev => prev.map(p =>
          p.id === preset.id ? { ...p, isActive: false } : p
        ));

        // Save in background - revert on error
        const presetToSave = { ...preset, isActive: false };
        savePreset(userEmail, presetToSave).then(async result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail);
            // Sync all scheduled presets to native (with this one now deactivated)
            const updatedPresets = presets.map(p =>
              p.id === preset.id ? { ...p, isActive: false } : p
            );
            await syncScheduledPresetsToNative(updatedPresets);
          } else {
            // Revert on error
            setPresets(prev => prev.map(p =>
              p.id === preset.id ? { ...p, isActive: true } : p
            ));
            console.error('Failed to save preset:', result.error);
          }
        });
      } else {
        // Non-scheduled preset
        // OPTIMISTIC UPDATE - update UI immediately
        setActivePresetId(null);
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : false,
        })));

        // Save in background
        activatePreset(userEmail, null).then(result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail);
          } else {
            // Revert on error - re-activate this preset
            setActivePresetId(preset.id);
            setPresets(prev => prev.map(p => ({
              ...p,
              isActive: p.isScheduled ? p.isActive : p.id === preset.id,
            })));
          }
        });
      }
    }
  }, [userEmail, syncScheduledPresetsToNative, presets, dateRangesOverlap]);

  const handleAddPreset = useCallback(() => {
    setEditingPreset(null);
    setEditModalVisible(true);
  }, []);

  const handleEditPreset = useCallback((preset: Preset) => {
    // Check if this is an active recurring preset - prevent editing
    if (preset.repeat_enabled && preset.isActive) {
      setActiveRecurringModalVisible(true);
      return;
    }
    setEditingPreset(preset);
    setEditModalVisible(true);
  }, []);

  const handleLongPressPreset = useCallback((preset: Preset) => {
    setPresetToDelete(preset);
    setDeleteModalVisible(true);
  }, []);

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
    deletePresetApi(userEmail, presetId).then(async result => {
      if (result.success) {
        // If deleting an active non-scheduled preset, clear active
        if (wasActiveNonScheduled) {
          await activatePreset(userEmail, null);
        }

        // If deleting a scheduled preset, sync to native
        if (wasScheduled) {
          await syncScheduledPresetsToNative(updatedPresets);
        }
      } else {
        // Revert on error - add preset back
        console.error('Failed to delete preset:', result.error);
        setPresets(prev => [...prev, presetToDelete]);
        if (wasActiveNonScheduled) {
          setActivePresetId(presetId);
        }
      }
    });
  }, [presetToDelete, userEmail, activePresetId, presets, syncScheduledPresetsToNative]);

  const handleSavePreset = useCallback(async (preset: Preset) => {
    // Prevent duplicate saves
    if (isSaving) return;

    setIsSaving(true);

    let presetToSave: Preset;

    if (editingPreset) {
      // Editing existing preset - keep the same id and isActive status
      presetToSave = {
        ...preset,
        id: editingPreset.id,
        isActive: editingPreset.isActive,
        isDefault: editingPreset.isDefault,
      };

      // If editing a scheduled preset, FIRST cancel existing alarms to prevent race conditions
      // This ensures old schedule times don't fire while we're updating to new times
      if (editingPreset.isScheduled) {
        try {
          await ScheduleModule?.cancelPresetAlarm(editingPreset.id);
          console.log('[PresetsScreen] Cancelled existing alarms for preset before update:', editingPreset.id);
        } catch (e) {
          console.log('[PresetsScreen] Could not cancel existing alarm (may not exist):', e);
        }
      }

      // If editing an active scheduled preset, check if new times overlap with other active scheduled presets
      if (presetToSave.isScheduled && presetToSave.isActive) {
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
            // New times overlap with another active scheduled preset - auto-disable this one
            presetToSave = { ...presetToSave, isActive: false };
            break;
          }
        }
      }
    } else {
      // Creating new preset
      presetToSave = {
        ...preset,
        id: `preset-${Date.now()}`,
        isActive: false,
        isDefault: false,
      };
    }

    const result = await savePreset(userEmail, presetToSave);

    if (result.success) {
      // Invalidate cache so other screens get fresh data
      invalidateUserCaches(userEmail);

      let updatedPresets: Preset[];
      if (editingPreset) {
        updatedPresets = presets.map(p => (p.id === presetToSave.id ? presetToSave : p));
        setPresets(updatedPresets);

        // If this is the active non-scheduled preset, also update user_cards settings
        if (presetToSave.isActive && !presetToSave.isScheduled) {
          await activatePreset(userEmail, presetToSave.id);
        }
      } else {
        updatedPresets = [...presets, presetToSave];
        setPresets(updatedPresets);
      }

      // Sync scheduled presets to native for background activation
      // This will reschedule with the NEW times now that old alarms are cancelled
      if (presetToSave.isScheduled) {
        await syncScheduledPresetsToNative(updatedPresets);
      }
    } else {
      console.error('Failed to save preset:', result.error);
    }

    setEditModalVisible(false);
    setEditingPreset(null);
    setIsSaving(false);
  }, [isSaving, editingPreset, userEmail, syncScheduledPresetsToNative, presets, dateRangesOverlap]);

  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setEditingPreset(null);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setPresetToDelete(null);
  }, []);

  const handleExpiredPreset = useCallback(async (preset: Preset) => {
    console.log('[PresetsScreen] handleExpiredPreset called:', {
      name: preset.name,
      id: preset.id,
      isScheduled: preset.isScheduled,
      repeat_enabled: preset.repeat_enabled,
      repeat_unit: preset.repeat_unit,
      repeat_interval: preset.repeat_interval,
      scheduleStartDate: preset.scheduleStartDate,
      scheduleEndDate: preset.scheduleEndDate,
    });

    // Auto-deactivate expired preset
    if (preset.isScheduled) {
      // Check if this is a recurring preset - if so, auto-renew instead of deactivating
      if (preset.repeat_enabled && preset.repeat_unit && preset.repeat_interval && preset.scheduleStartDate && preset.scheduleEndDate) {
        console.log('[PresetsScreen] RECURRING: Calculating next occurrence...');
        console.log('[PresetsScreen] RECURRING: Current dates:', {
          start: preset.scheduleStartDate,
          end: preset.scheduleEndDate,
        });

        const startDate = new Date(preset.scheduleStartDate);
        const endDate = new Date(preset.scheduleEndDate);
        const duration = endDate.getTime() - startDate.getTime();
        const interval = preset.repeat_interval;

        console.log('[PresetsScreen] RECURRING: Calculation params:', {
          durationMs: duration,
          durationMinutes: duration / 60000,
          interval: interval,
          unit: preset.repeat_unit,
          startTime: startDate.getTime(),
          endTime: endDate.getTime(),
        });

        // Safety check: if duration is 0 or negative, something is wrong - skip renewal
        if (duration <= 0) {
          console.error('[PresetsScreen] RECURRING: Invalid duration, skipping renewal');
          return;
        }

        let nextStart: Date;
        let nextEnd: Date;

        // Calculate next occurrence based on unit type
        if (preset.repeat_unit === 'minutes' || preset.repeat_unit === 'hours') {
          // For minutes/hours: add interval to END time to get new START
          const intervalMs = preset.repeat_unit === 'minutes'
            ? interval * 60 * 1000
            : interval * 60 * 60 * 1000;
          const newStartTime = endDate.getTime() + intervalMs;
          nextStart = new Date(newStartTime);
          nextEnd = new Date(newStartTime + duration);
          console.log('[PresetsScreen] RECURRING: Minutes/Hours calculation:', {
            intervalMs,
            newStartTime,
            nextStartISO: nextStart.toISOString(),
            nextEndISO: nextEnd.toISOString(),
          });
        } else {
          // For days/weeks/months: add interval to START date
          nextStart = new Date(startDate);
          nextEnd = new Date(endDate);
          if (preset.repeat_unit === 'days') {
            nextStart.setDate(nextStart.getDate() + interval);
            nextEnd.setDate(nextEnd.getDate() + interval);
            console.log('[PresetsScreen] RECURRING: Days calculation - added', interval, 'days');
          } else if (preset.repeat_unit === 'weeks') {
            nextStart.setDate(nextStart.getDate() + (interval * 7));
            nextEnd.setDate(nextEnd.getDate() + (interval * 7));
            console.log('[PresetsScreen] RECURRING: Weeks calculation - added', interval * 7, 'days');
          } else if (preset.repeat_unit === 'months') {
            nextStart.setMonth(nextStart.getMonth() + interval);
            nextEnd.setMonth(nextEnd.getMonth() + interval);
            console.log('[PresetsScreen] RECURRING: Months calculation - added', interval, 'months');
          }
        }

        console.log('[PresetsScreen] RECURRING: Next occurrence calculated:', {
          nextStart: nextStart.toISOString(),
          nextEnd: nextEnd.toISOString(),
          newDuration: nextEnd.getTime() - nextStart.getTime(),
        });

        // Update preset with new dates, keep it active
        const renewedPreset: Preset = {
          ...preset,
          scheduleStartDate: nextStart.toISOString(),
          scheduleEndDate: nextEnd.toISOString(),
          isActive: true, // Keep it active for next occurrence
        };

        console.log('[PresetsScreen] RECURRING: Renewed preset ready:', {
          name: renewedPreset.name,
          newStart: renewedPreset.scheduleStartDate,
          newEnd: renewedPreset.scheduleEndDate,
          isActive: renewedPreset.isActive,
        });

        const updatedPresets = presets.map(p =>
          p.id === preset.id ? renewedPreset : p
        );
        setPresets(updatedPresets);

        // Save to backend first (priority)
        console.log('[PresetsScreen] RECURRING: Saving to backend...');
        savePreset(userEmail, renewedPreset).then(async () => {
          console.log('[PresetsScreen] RECURRING: Backend save SUCCESS');
          // Invalidate caches so other screens get fresh data
          invalidateUserCaches(userEmail);
          // Sync to native to schedule the next alarm
          console.log('[PresetsScreen] RECURRING: Syncing to native...');
          await syncScheduledPresetsToNative(updatedPresets);
          console.log('[PresetsScreen] RECURRING: Native sync SUCCESS');
        }).catch(err => {
          console.error('[PresetsScreen] RECURRING: Backend save FAILED:', err);
        });

        return; // Don't deactivate - we've renewed it
      }

      // Non-recurring scheduled preset expired - just mark it as inactive
      const updatedPresets = presets.map(p =>
        p.id === preset.id ? { ...p, isActive: false } : p
      );
      setPresets(updatedPresets);
      // Save to backend
      const presetToSave = { ...preset, isActive: false };
      savePreset(userEmail, presetToSave).then(async () => {
        // Sync to native to cancel the alarm
        await syncScheduledPresetsToNative(updatedPresets);
      }).catch(err => {
        console.error('Failed to save expired scheduled preset:', err);
      });
    } else if (activePresetId === preset.id) {
      // Non-scheduled preset expired
      const result = await activatePreset(userEmail, null);
      if (result.success) {
        setActivePresetId(null);
        // Only set non-scheduled presets to inactive, preserve scheduled preset states
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : false,
        })));
      }
    }
  }, [activePresetId, userEmail, presets, syncScheduledPresetsToNative]);

  const renderPresetItem = useCallback(({ item: preset }: { item: Preset }) => {
    // For scheduled presets, use preset.isActive directly
    // For non-scheduled presets, use activePresetId
    const isPresetActive = preset.isScheduled ? preset.isActive : activePresetId === preset.id;

    return (
      <PresetCard
        preset={preset}
        isActive={isPresetActive}
        onPress={() => handleEditPreset(preset)}
        onLongPress={() => handleLongPressPreset(preset)}
        onToggle={(value) => handleTogglePreset(preset, value)}
        disabled={isDisabled}
        onExpired={() => handleExpiredPreset(preset)}
      />
    );
  }, [activePresetId, handleEditPreset, handleLongPressPreset, handleTogglePreset, isDisabled, handleExpiredPreset]);

  const keyExtractor = useCallback((item: Preset) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View className="items-center py-12">
      {!loading && (
        <>
          <Image
            source={require('../frontassets/scutelogo.png')}
            style={{
              width: 80,
              height: 80,
              tintColor: colors.textMuted,
              opacity: 0.3
            }}
            resizeMode="contain"
          />
          <Text style={{ color: colors.textSecondary }} className="text-base font-nunito mt-4">
            No presets yet
          </Text>
          <Text style={{ color: colors.textMuted }} className="text-sm font-nunito mt-1">
            Tap + to create one
          </Text>
        </>
      )}
    </View>
  ), [loading, colors.textSecondary, colors.textMuted]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Locked Overlay */}
      {isLocked === true && (
        <View style={{ backgroundColor: colors.bg + 'F2' }} className="absolute inset-0 z-50 items-center justify-center">
          <Image
            source={require('../frontassets/scutelogo.png')}
            style={{ width: 120, height: 120, tintColor: colors.logoTint, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text style={{ color: colors.text }} className="text-xl font-nunito-bold mb-2">Phone is Locked</Text>
          <Text style={{ color: colors.textSecondary }} className="text-center font-nunito px-8">
            Presets cannot be changed while blocking is active.
          </Text>
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold">Presets</Text>
          {loading && (
            <ActivityIndicator size="small" color={colors.green} style={{ marginLeft: 12 }} />
          )}
        </View>

        {/* Add Button - stays green but disabled when locked */}
        <TouchableOpacity
          onPress={handleAddPreset}
          activeOpacity={0.7}
          disabled={isDisabled}
          style={{ backgroundColor: colors.green }}
          className="w-11 h-11 rounded-xl items-center justify-center"
        >
          <Text className="text-2xl font-nunito-light text-black">+</Text>
        </TouchableOpacity>
      </View>

      {/* Presets List - only show after loading is complete */}
      {!loading && (
        <FlatList
          className="flex-1"
          data={presets}
          renderItem={renderPresetItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Edit/Create Modal */}
      <PresetEditModal
        visible={editModalVisible}
        preset={editingPreset}
        onClose={handleCloseEditModal}
        onSave={handleSavePreset}
        email={userEmail}
        existingPresets={presets}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Preset"
        message={`Are you sure you want to delete "${presetToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeletePreset}
        onCancel={handleCloseDeleteModal}
      />

      {/* Schedule Overlap Modal */}
      <ConfirmationModal
        visible={overlapModalVisible}
        title="Schedule Overlap"
        message={`This schedule overlaps with "${overlapPresetName}". Please choose different dates or disable the other scheduled preset first.`}
        confirmText="OK"
        onConfirm={() => setOverlapModalVisible(false)}
        onCancel={() => setOverlapModalVisible(false)}
      />

      {/* Schedule Verification Modal */}
      <ConfirmationModal
        visible={scheduleVerifyModalVisible}
        title="Enable Schedule?"
        message={`Do you want to enable the scheduled preset "${pendingScheduledPreset?.name}"? It will automatically activate during its scheduled time.`}
        confirmText="Enable"
        cancelText="Cancel"
        onConfirm={handleScheduleVerifyConfirm}
        onCancel={handleScheduleVerifyCancel}
      />

      {/* Active Recurring Preset Modal */}
      <ActiveRecurringPresetModal
        visible={activeRecurringModalVisible}
        onClose={() => setActiveRecurringModalVisible(false)}
      />

    </SafeAreaView>
  );
}

export default memo(PresetsScreen);
