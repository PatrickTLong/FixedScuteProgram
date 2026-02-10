import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  NativeModules,
  Image,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import HeaderIconButton from '../components/HeaderIconButton';
import PresetCard, { Preset } from '../components/PresetCard';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  savePreset,
  deletePreset as deletePresetApi,
  activatePreset,
  invalidateUserCaches,
} from '../services/cardApi';
import { AnimatedPresetsIcon, AnimatedPresetsIconRef } from '../components/BottomTabBar';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/types';
import { usePresetSave } from '../navigation/PresetsStack';
import { useAuth } from '../context/AuthContext';

const { InstalledAppsModule, ScheduleModule } = NativeModules;

const PlusIcon = ({ size = iconSize.lg, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
    />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
    />
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
  const { userEmail, sharedPresets, setSharedPresets, sharedIsLocked, refreshPresets, refreshLockStatus } = useAuth();
  const userEmail_safe = userEmail || '';
  const { setOnSave, setEditingPreset: setContextEditingPreset, setExistingPresets, setEmail } = usePresetSave();

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

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // "Preset Saved" toast state
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastOpacity = useRef(new Animated.Value(0)).current;

  // Header icon animation - only when coming from other tabs, not from edit screens
  const headerIconRef = useRef<AnimatedPresetsIconRef>(null);
  const isReturningFromEdit = useRef(false);


  useFocusEffect(
    useCallback(() => {
      // Skip animation if returning from edit screens
      if (isReturningFromEdit.current) {
        isReturningFromEdit.current = false;
        return;
      }
      // Trigger header icon animation on screen focus
      if (headerIconRef.current) {
        headerIconRef.current.animate();
      }
    }, [])
  );

  // Mark when navigating to edit screens
  const handleAddPresetWithFlag = useCallback(() => {
    isReturningFromEdit.current = true;
    setContextEditingPreset(null);
    setExistingPresets(presets);
    setEmail(userEmail_safe);
    navigation.getParent()?.navigate('EditPresetApps');
  }, [presets, userEmail_safe, navigation, setContextEditingPreset, setExistingPresets, setEmail]);

  const handleEditPresetWithFlag = useCallback((preset: Preset) => {
    isReturningFromEdit.current = true;
    setContextEditingPreset(preset);
    setExistingPresets(presets);
    setEmail(userEmail_safe);
    navigation.getParent()?.navigate('EditPresetApps');
  }, [presets, userEmail_safe, navigation, setContextEditingPreset, setExistingPresets, setEmail]);

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

  // Disable interactions until lock status is checked, or if locked
  const isDisabled = !lockChecked || sharedIsLocked === true;


  // Sync all scheduled presets to native module for background activation
  const syncScheduledPresetsToNative = useCallback(async (allPresets: Preset[]) => {
    try {
      // Filter to only scheduled presets that are active (toggled on)
      const scheduledPresets = allPresets.filter(p => p.isScheduled && p.isActive);
      const presetsJson = JSON.stringify(scheduledPresets);
      await ScheduleModule?.saveScheduledPresets(presetsJson);
    } catch (e) {
      // Failed to sync scheduled presets
    }
  }, []);

  // Actually enable a scheduled preset (called after verification)
  const enableScheduledPreset = useCallback(async (preset: Preset) => {
    // OPTIMISTIC UPDATE - update UI immediately
    setPresets(prev => prev.map(p =>
      p.id === preset.id ? { ...p, isActive: true } : p
    ));

    // Save in background - revert on error
    const presetToSave = { ...preset, isActive: true };
    savePreset(userEmail_safe, presetToSave).then(async result => {
      if (result.success) {
        // Invalidate cache so other screens get fresh data
        invalidateUserCaches(userEmail_safe);
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
      }
    });
  }, [userEmail_safe, presets, syncScheduledPresetsToNative]);

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
            setOverlapIsTimedVsScheduled(false);
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
                setOverlapIsTimedVsScheduled(true);
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
        activatePreset(userEmail_safe, preset.id).then(async result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
          } else {
            // Revert on error
            setActivePresetId(null);
            setPresets(prev => prev.map(p => ({
              ...p,
              isActive: p.isScheduled ? p.isActive : false,
            })));
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
        savePreset(userEmail_safe, presetToSave).then(async result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
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
        activatePreset(userEmail_safe, null).then(result => {
          if (result.success) {
            // Invalidate cache so other screens get fresh data
            invalidateUserCaches(userEmail_safe);
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
  }, [userEmail_safe, syncScheduledPresetsToNative, presets]);


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
      }
    });
  }, [presetToDelete, userEmail_safe, activePresetId, presets, syncScheduledPresetsToNative]);

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
    // Show "Preset Saved" toast immediately
    showSavedToastAnimation();

    const editingPreset = presets.find(p => p.id === preset.id) || null;
    const isEditing = !!editingPreset;

    let presetToSave: Preset;

    if (isEditing && editingPreset) {
      presetToSave = {
        ...preset,
        id: editingPreset.id,
        isActive: editingPreset.isActive,
        isDefault: editingPreset.isDefault,
      };

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
        try { await ScheduleModule?.cancelPresetAlarm(editingPreset.id); } catch (_) {}
      }

      const result = await savePreset(userEmail_safe, presetToSave);

      if (result.success) {
        invalidateUserCaches(userEmail_safe);

        if (isEditing && presetToSave.isActive && !presetToSave.isScheduled) {
          await activatePreset(userEmail_safe, presetToSave.id);
        }

        const latestPresets = isEditing
          ? previousPresets.map(p => (p.id === presetToSave.id ? presetToSave : p))
          : [...previousPresets, presetToSave];

        if (presetToSave.isScheduled) {
          await syncScheduledPresetsToNative(latestPresets);
        }
      } else {
        // Revert on failure
        setPresets(previousPresets);
      }
    } catch (_) {
      // Revert on error
      setPresets(previousPresets);
    }
  }, [userEmail_safe, syncScheduledPresetsToNative, presets, showSavedToastAnimation]);

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
    // Auto-deactivate expired preset
    if (preset.isScheduled) {
      // Scheduled preset expired - just mark it as inactive
      const updatedPresets = presets.map(p =>
        p.id === preset.id ? { ...p, isActive: false } : p
      );
      setPresets(updatedPresets);
      // Save to backend
      const presetToSave = { ...preset, isActive: false };
      savePreset(userEmail_safe, presetToSave).then(async () => {
        // Sync to native to cancel the alarm
        await syncScheduledPresetsToNative(updatedPresets);
      }).catch(() => {
        // Failed to save expired scheduled preset
      });
    } else if (activePresetId === preset.id) {
      // Non-scheduled preset expired
      const result = await activatePreset(userEmail_safe, null);
      if (result.success) {
        setActivePresetId(null);
        // Only set non-scheduled presets to inactive, preserve scheduled preset states
        setPresets(prev => prev.map(p => ({
          ...p,
          isActive: p.isScheduled ? p.isActive : false,
        })));
      }
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
    <View className="items-center py-12" style={{ marginTop: s(-40) }}>
      {!loading && (
        <>
          <View className="items-center">
            <Image
              source={require('../frontassets/TrueScute-Photoroom.png')}
              style={{
                width: s(250),
                height: s(250),
                tintColor: colors.textMuted,
                opacity: 0.3,
                marginBottom: s(-80),
              }}
              resizeMode="contain"
            />
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>
              No presets yet
            </Text>
          </View>
          <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
            Tap + to create one
          </Text>
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
            <Lottie
              source={require('../frontassets/Loading Dots Blue.json')}
              autoPlay
              loop
              speed={2.5}
              style={{ width: s(200), height: s(200) }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Locked Overlay */}
      {sharedIsLocked === true && (
        <View style={{ backgroundColor: colors.bg + 'F2' }} className="absolute inset-0 z-50 items-center justify-center" pointerEvents="auto" onStartShouldSetResponder={() => true}>
          <View className="items-center" style={{ marginTop: '-20%' }}>
            <Image
              source={require('../frontassets/TrueScute-Photoroom.png')}
              style={{ width: s(250), height: s(250), tintColor: colors.logoTint, marginBottom: s(-60) }}
              resizeMode="contain"
            />
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} mb-2`}>Phone is Locked</Text>
            <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} px-8`}>
              Presets cannot be changed while blocking is active.
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Presets</Text>
          <View style={{ marginLeft: s(8) }}>
            <AnimatedPresetsIcon ref={headerIconRef} color={colors.text} filled />
          </View>
        </View>

        {/* Add Button - stays green but disabled when locked */}
          <HeaderIconButton
            onPress={handleAddPresetWithFlag}
            disabled={isDisabled}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, ...shadow.card,
              width: s(44), height: s(44), borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
            }}
            className=""
          >
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: -1 }} className={`${textSize['2xLarge']} ${fontFamily.light}`}>+</Text>
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
              <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
                fill={colors.text}
              />
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
