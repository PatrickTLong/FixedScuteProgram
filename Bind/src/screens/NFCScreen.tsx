import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  ScrollView,
  Modal,
  NativeModules,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NfcManager, { NfcTech, NfcEvents, Ndef } from 'react-native-nfc-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button';
import BackButton from '../components/BackButton';
import NFCScanModal from '../components/NFCScanModal';
import RegisterCardModal from '../components/RegisterCardModal';
import ConfigModal from '../components/ConfigModal';
import SelectAppsScreen from './SelectAppsScreen';
import {
  formatUidForDisplay,
  addCardToWhitelist,
  unregisterCard,
  getUserCardData,
  saveUserSettings,
  updateLockStatus,
  TapSettings,
} from '../services/cardApi';

const { InstalledAppsModule, DeviceAdminModule, WebsiteBlockerModule, NfcConfigModule } = NativeModules;

// Admin email - only this email can add new cards to the whitelist
const ADMIN_EMAIL = 'longpatrick3317@gmail.com';

// Local storage keys (for native module sync only - main data is in Supabase)
const TAP_CONFIG_KEY = 'scute_tap_config';
const TEMP_BYPASS_KEY = 'scute_temp_bypass';
const TEMP_BYPASS_ENABLED = true;

interface Props {
  onBack: () => void;
  userEmail: string;
}

interface TapConfig {
  mode: 'all' | 'specific';
  selectedApps: string[];
  blockedWebsites: string[];
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  blockSettings: boolean;
  noTimeLimit?: boolean;
  targetDate?: string | null;
}

interface InstalledApp {
  id: string;
  name: string;
  isPopular: boolean;
}

// All known system settings packages for different device manufacturers
const SETTINGS_PACKAGES = [
  'com.android.settings',
  'com.samsung.android.settings',
  'com.miui.securitycenter',
  'com.coloros.settings',
  'com.oppo.settings',
  'com.vivo.settings',
  'com.huawei.systemmanager',
  'com.oneplus.settings',
  'com.google.android.settings.intelligence',
];

const ESSENTIAL_APPS = [
  'com.android.phone',
  'com.google.android.dialer',
  'com.samsung.android.dialer',
  'com.android.contacts',
  'com.google.android.contacts',
  'com.android.mms',
  'com.google.android.apps.messaging',
  'com.samsung.android.messaging',
  'com.android.emergency',
  'com.google.android.apps.safetyhub',
  ...SETTINGS_PACKAGES, // Include all settings packages
];

const FALLBACK_APPS: InstalledApp[] = [
  { id: 'com.instagram.android', name: 'Instagram', isPopular: true },
  { id: 'com.zhiliaoapp.musically', name: 'TikTok', isPopular: true },
  { id: 'com.google.android.youtube', name: 'YouTube', isPopular: true },
  { id: 'com.twitter.android', name: 'Twitter/X', isPopular: true },
  { id: 'com.facebook.katana', name: 'Facebook', isPopular: true },
  { id: 'com.snapchat.android', name: 'Snapchat', isPopular: true },
  { id: 'com.whatsapp', name: 'WhatsApp', isPopular: true },
  { id: 'com.facebook.orca', name: 'Messenger', isPopular: true },
  { id: 'com.reddit.frontpage', name: 'Reddit', isPopular: true },
  { id: 'com.discord', name: 'Discord', isPopular: true },
  { id: 'com.spotify.music', name: 'Spotify', isPopular: true },
  { id: 'com.netflix.mediaclient', name: 'Netflix', isPopular: true },
  { id: 'com.amazon.mShop.android.shopping', name: 'Amazon', isPopular: false },
  { id: 'com.pinterest', name: 'Pinterest', isPopular: false },
  { id: 'com.linkedin.android', name: 'LinkedIn', isPopular: false },
  { id: 'tv.twitch.android.app', name: 'Twitch', isPopular: false },
  { id: 'com.google.android.gm', name: 'Gmail', isPopular: false },
  { id: 'com.microsoft.teams', name: 'Microsoft Teams', isPopular: false },
  { id: 'com.google.android.apps.photos', name: 'Google Photos', isPopular: false },
  { id: 'com.bumble.app', name: 'Bumble', isPopular: false },
  { id: 'com.tinder', name: 'Tinder', isPopular: false },
  { id: 'com.hinge.app', name: 'Hinge', isPopular: false },
];

function NFCScreen({ onBack, userEmail }: Props) {
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeredTagId, setRegisteredTagId] = useState<string | null>(null);
  const [hasBypass, setHasBypass] = useState(false);
  const [isBlockingActive, setIsBlockingActive] = useState(false);

  const isCancelling = useRef(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const bgFlash = useRef(new Animated.Value(0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const savedConfigRef = useRef<TapConfig | null>(null);
  const installedAppsRef = useRef<InstalledApp[]>(FALLBACK_APPS);
  const registeredTagIdRef = useRef<string | null>(null);
  const handleTagDiscoveredRef = useRef<((tag: any) => void) | null>(null);
  const isRegisteringRef = useRef(false);

  // NFC operation lock - prevents concurrent NFC operations from conflicting
  const nfcOperationLockRef = useRef(false);
  const isAdminOperationRef = useRef(false);

  // Stable tag handler function that delegates to the ref
  const stableTagHandler = useCallback((tag: any) => {
    handleTagDiscoveredRef.current?.(tag);
  }, []);

  // Config state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configMode, setConfigMode] = useState<'all' | 'specific' | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [websiteInput, setWebsiteInput] = useState('');
  const [isWebsiteValid, setIsWebsiteValid] = useState(false);
  const [timerDays, setTimerDays] = useState(0);
  const [timerHours, setTimerHours] = useState(1);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [blockSettings, setBlockSettings] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [savedConfig, setSavedConfig] = useState<TapConfig | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>(FALLBACK_APPS);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showAppSelector, setShowAppSelector] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [sessionNoTimeLimit, setSessionNoTimeLimit] = useState(false);

  // Admin mode state
  const [showAdminScanModal, setShowAdminScanModal] = useState(false);
  const [lastScannedUid, setLastScannedUid] = useState<string | null>(null);
  const [adminScanStatus, setAdminScanStatus] = useState<'ready' | 'scanning' | 'success' | 'error' | 'exists'>('ready');
  const [adminMessage, setAdminMessage] = useState('');

  // Verification modal state for NFC tap activation
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<{
    settings: TapConfig;
    apps: InstalledApp[];
    presetName?: string;
  } | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    savedConfigRef.current = savedConfig;
  }, [savedConfig]);

  useEffect(() => {
    installedAppsRef.current = installedApps;
  }, [installedApps]);

  useEffect(() => {
    registeredTagIdRef.current = registeredTagId;
  }, [registeredTagId]);

  // Sync config to native whenever savedConfig or installedApps change
  useEffect(() => {
    if (!savedConfig) return;

    // Use ref to ensure we have the latest apps data
    const currentApps = installedAppsRef.current;
    if (!currentApps || currentApps.length === 0) {
      console.log('Skipping native config sync - no apps loaded yet');
      return;
    }

    const totalMinutes = savedConfig.timerDays * 24 * 60 + savedConfig.timerHours * 60 + savedConfig.timerMinutes;
    const hasTargetDate = !!savedConfig.targetDate;
    const effectiveNoTimeLimit = savedConfig.noTimeLimit || (totalMinutes === 0 && !hasTargetDate);

    let durationMs: number;
    if (hasTargetDate && !savedConfig.noTimeLimit) {
      // Calculate duration from now until target date
      const targetTime = new Date(savedConfig.targetDate!).getTime();
      durationMs = Math.max(targetTime - Date.now(), 0);
    } else if (effectiveNoTimeLimit) {
      durationMs = Number.MAX_SAFE_INTEGER;
    } else {
      durationMs = totalMinutes * 60 * 1000;
    }
    const appsToBlock = savedConfig.mode === 'all'
      ? currentApps.map(app => app.id)
      : savedConfig.selectedApps;
    const finalApps = savedConfig.blockSettings
      ? [...appsToBlock, ...SETTINGS_PACKAGES]
      : appsToBlock;

    const nativeConfig = {
      blockedApps: finalApps,
      blockedWebsites: savedConfig.blockedWebsites ?? [],
      durationMs,
      noTimeLimit: effectiveNoTimeLimit,
    };

    console.log('Auto-syncing native config, apps count:', finalApps.length, 'noTimeLimit:', effectiveNoTimeLimit, 'durationMs:', durationMs, 'targetDate:', savedConfig.targetDate);
    NfcConfigModule?.setTapConfig(JSON.stringify(nativeConfig)).catch((e: any) =>
      console.log('Failed to sync native config:', e)
    );
  }, [savedConfig, installedApps]);

  const stopBlockingSession = useCallback(async () => {
    try {
      if (DeviceAdminModule) {
        // Update ref immediately to prevent race conditions
        isBlockingActiveRef.current = false;
        await DeviceAdminModule.stopBlockingSession();
        setIsBlockingActive(false);

        // Update lock status in Supabase
        await updateLockStatus(userEmail, false);
      }
    } catch (error) {
      console.error('Failed to stop blocking session:', error);
      // Revert ref on error
      isBlockingActiveRef.current = true;
    }
  }, [userEmail]);

  const activateBlockingSession = useCallback(async (config: TapConfig, apps: InstalledApp[]) => {
    try {
      console.log('=== ACTIVATING BLOCKING SESSION ===');
      console.log('Config mode:', config.mode);
      console.log('Apps list length:', apps?.length);
      console.log('Selected apps:', config.selectedApps?.length);
      console.log('No time limit:', config.noTimeLimit);
      console.log('Target date:', config.targetDate);
      console.log('Timer:', config.timerDays, 'd', config.timerHours, 'h', config.timerMinutes, 'm');

      // Check if using target date
      const hasTargetDate = config.targetDate && !config.noTimeLimit;
      const hasTimerDuration = !config.noTimeLimit &&
        (config.timerDays > 0 || config.timerHours > 0 || config.timerMinutes > 0);

      const isNoTimeLimit = config.noTimeLimit || (!hasTargetDate && !hasTimerDuration);

      let durationMs: number;
      let lockEndsAtDate: Date | null = null;

      if (hasTargetDate) {
        // Calculate duration from now until target date
        const targetTime = new Date(config.targetDate!).getTime();
        const now = Date.now();
        durationMs = Math.max(targetTime - now, 0);
        lockEndsAtDate = new Date(config.targetDate!);
        console.log('Using target date, duration ms:', durationMs);
      } else if (isNoTimeLimit) {
        durationMs = 2147483647;
      } else {
        durationMs = (config.timerDays * 24 * 60 * 60 * 1000) +
          (config.timerHours * 60 * 60 * 1000) +
          (config.timerMinutes * 60 * 1000);
      }

      console.log('Duration ms:', durationMs);
      console.log('Is no time limit:', isNoTimeLimit);

      // Use fallback apps if apps array is empty
      const appsList = apps?.length > 0 ? apps : FALLBACK_APPS;

      let appsToBlock = config.mode === 'all'
        ? appsList.map(app => app.id)
        : config.selectedApps;

      if (config.blockSettings) {
        appsToBlock = [...appsToBlock, ...SETTINGS_PACKAGES];
      }

      console.log('Apps to block count:', appsToBlock?.length);

      if (!appsToBlock || appsToBlock.length === 0) {
        console.warn('No apps to block - cannot activate session');
        Alert.alert('Error', 'No apps selected to block.');
        return;
      }

      if (DeviceAdminModule) {
        // Update ref immediately to prevent race conditions
        isBlockingActiveRef.current = true;
        const websites = config.blockedWebsites || [];
        console.log('Websites to block:', websites.length);

        if (websites.length > 0) {
          console.log('Calling startBlockingSessionWithWebsites...');
          await DeviceAdminModule.startBlockingSessionWithWebsites(appsToBlock, websites, durationMs);
        } else {
          console.log('Calling startBlockingSession...');
          await DeviceAdminModule.startBlockingSession(appsToBlock, durationMs);
        }
        setIsBlockingActive(true);
        console.log('Blocking session activated!');

        // Update lock status in Supabase
        const lockEndsAt = isNoTimeLimit
          ? null
          : lockEndsAtDate
            ? lockEndsAtDate.toISOString()
            : new Date(Date.now() + durationMs).toISOString();
        await updateLockStatus(userEmail, true, lockEndsAt);
      } else {
        console.error('DeviceAdminModule not available');
        Alert.alert('Error', 'Device admin module not available.');
      }
    } catch (error) {
      console.error('Failed to activate blocking:', error);
      // Revert ref on error
      isBlockingActiveRef.current = false;
      Alert.alert('Error', `Failed to start blocking: ${error}`);
    }
  }, [userEmail]);

  // Ref to track current blocking status for NFC handler
  const isBlockingActiveRef = useRef(false);

  useEffect(() => {
    isBlockingActiveRef.current = isBlockingActive;
  }, [isBlockingActive]);

  // Update the handler ref when dependencies change
  useEffect(() => {
    handleTagDiscoveredRef.current = async (tag: any) => {
      console.log('=== NFC TAG DETECTED ===');

      if (!tag?.id) {
        console.log('SKIP: No tag ID');
        return;
      }

      // Skip if any NFC operation is in progress (registration, admin scan, etc.)
      if (isRegisteringRef.current || isAdminOperationRef.current || nfcOperationLockRef.current) {
        console.log('SKIP: Operation in progress');
        return;
      }

      // Lock to prevent duplicate taps
      nfcOperationLockRef.current = true;

      try {
        // Fetch fresh data from backend on every tap
        console.log('Fetching user data from backend...');
        const userData = await getUserCardData(userEmail);
        console.log('User data from backend:', userData);

        // Check if user has a registered card
        if (!userData?.uid) {
          console.log('SKIP: No card registered in database');
          Vibration.vibrate([0, 100, 50, 100]);
          Alert.alert(
            'No Card Registered',
            'You need to register a card first before you can lock/unlock.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Normalize both IDs for comparison
        const normalizedTagId = tag.id.replace(/:/g, '').toUpperCase();
        const normalizedStoredId = userData.uid.replace(/:/g, '').toUpperCase();

        if (normalizedTagId !== normalizedStoredId) {
          console.log('SKIP: Wrong card - tapped:', normalizedTagId, 'registered:', normalizedStoredId);
          Vibration.vibrate([0, 100, 50, 100, 50, 100]);
          Alert.alert(
            'Wrong Card',
            'This card is not your registered card.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Toggle: unlock if blocking, lock if not
        if (isBlockingActiveRef.current) {
          // Check if unlock is allowed (only when noTimeLimit is true)
          try {
            const sessionInfo = await DeviceAdminModule?.getSessionInfo();
            if (sessionInfo?.isActive && !sessionInfo?.noTimeLimit) {
              // Duration is set - don't allow unlock via card tap
              Vibration.vibrate([0, 100, 50, 100, 50, 100]);
              Alert.alert(
                'Cannot Unlock Yet',
                'Timer is still active. You cannot unlock until the timer expires.',
                [{ text: 'OK' }]
              );
              return;
            }
          } catch (e) {
            console.error('Error checking session info:', e);
          }

          console.log('UNLOCKING session...');
          Vibration.vibrate([0, 200, 100, 200]);
          await stopBlockingSession();
          return;
        }

        // Check if settings exist in database (requires active preset)
        const settings = userData.settings;
        if (!settings) {
          console.log('SKIP: No preset enabled');
          Vibration.vibrate([0, 100, 50, 100]);
          Alert.alert(
            'No Preset Enabled',
            'Please enable a preset in the Presets tab before you can lock your phone.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Check if this is a scheduled preset (skip verification for scheduled)
        // The settings object may include isScheduled from the active preset
        const settingsAny = settings as any;
        const isScheduledPreset = settingsAny?.isScheduled || false;
        const apps = installedAppsRef.current;
        const presetName = settingsAny?.presetName || 'Current Preset';

        if (isScheduledPreset) {
          // Scheduled preset - activate immediately without verification
          console.log('LOCKING session (scheduled preset, no verification)...');
          console.log('Settings:', settings);
          Vibration.vibrate([0, 300, 100, 300]);

          try {
            await activateBlockingSession(settings as TapConfig, apps);
            console.log('Blocking session activated successfully');
          } catch (err) {
            console.error('Error activating blocking session:', err);
            Alert.alert('Error', 'Failed to activate blocking session.');
          }
        } else {
          // Non-scheduled preset - show verification modal first
          console.log('Showing verification modal for preset activation...');
          console.log('Settings:', settings);
          Vibration.vibrate([0, 100]); // Light vibration to indicate card was read

          // Store pending activation data and show modal
          setPendingActivation({
            settings: settings as TapConfig,
            apps,
            presetName,
          });
          setShowVerifyModal(true);
        }
      } catch (error) {
        console.error('Error in NFC tap handler:', error);
        Alert.alert('Error', 'Failed to process card tap. Please try again.');
      } finally {
        // Release lock
        nfcOperationLockRef.current = false;
      }
    };
  }, [userEmail, activateBlockingSession, stopBlockingSession]);

  useEffect(() => {
    let isMounted = true;
    let nfcInitialized = false;
    let statusIntervalId: ReturnType<typeof setInterval> | null = null;

    // Define loading functions inline to avoid hoisting issues
    const loadRegisteredTagInline = async () => {
      console.log('=== LOADING REGISTERED TAG FROM SUPABASE ===');
      console.log('User email:', userEmail);

      try {
        // Load from Supabase
        const userData = await getUserCardData(userEmail);
        const savedTagId = userData?.uid || null;
        console.log('Loaded tag from Supabase:', savedTagId);

        if (isMounted) {
          setRegisteredTagId(savedTagId);
          registeredTagIdRef.current = savedTagId;
          NfcConfigModule?.setRegisteredTagId(savedTagId).catch((e: any) =>
            console.log('Failed to sync tag to native:', e)
          );
        }
        return savedTagId;
      } catch (error) {
        console.error('Failed to load registered tag:', error);
        return null;
      }
    };

    const loadTapConfigInline = async () => {
      console.log('=== LOADING TAP CONFIG FROM SUPABASE ===');
      try {
        // Load from Supabase
        const userData = await getUserCardData(userEmail);
        const settings = userData?.settings;
        console.log('Settings from Supabase:', settings ? 'EXISTS' : 'NULL');

        if (settings && isMounted) {
          const parsed: TapConfig = settings as TapConfig;
          setSavedConfig(parsed);
          savedConfigRef.current = parsed;
          setConfigMode(parsed.mode);
          setSelectedApps(parsed.selectedApps);
          setBlockedWebsites(parsed.blockedWebsites ?? []);
          setTimerDays(parsed.timerDays);
          setTimerHours(parsed.timerHours);
          setTimerMinutes(parsed.timerMinutes);
          setBlockSettings(parsed.blockSettings ?? false);
          setNoTimeLimit(parsed.noTimeLimit ?? false);
          console.log('Loaded config - mode:', parsed.mode, 'noTimeLimit:', parsed.noTimeLimit);

          // Also sync to local storage for native module
          await AsyncStorage.setItem(TAP_CONFIG_KEY, JSON.stringify(parsed));
          return parsed;
        }
      } catch (error) {
        console.error('Failed to load tap config:', error);
      }
      return null;
    };

    const loadInstalledAppsInline = async () => {
      // Set fallback immediately
      const fallback = FALLBACK_APPS.filter(app => !ESSENTIAL_APPS.includes(app.id));
      if (isMounted) {
        setInstalledApps(fallback);
        installedAppsRef.current = fallback;
      }

      try {
        if (isMounted) setLoadingApps(true);
        if (InstalledAppsModule) {
          const apps = await InstalledAppsModule.getInstalledApps();
          if (apps?.length > 0 && isMounted) {
            const filtered = apps.filter((app: InstalledApp) => !ESSENTIAL_APPS.includes(app.id));
            setInstalledApps(filtered);
            installedAppsRef.current = filtered;
            console.log('Loaded', filtered.length, 'installed apps');
          }
        }
      } catch (error) {
        console.error('Error loading installed apps:', error);
      } finally {
        if (isMounted) setLoadingApps(false);
      }
    };

    const checkBypassInline = async () => {
      if (TEMP_BYPASS_ENABLED) {
        const bypass = await AsyncStorage.getItem(TEMP_BYPASS_KEY);
        if (isMounted) setHasBypass(bypass === 'true');
      }
    };

    const checkBlockingStatusInline = async () => {
      try {
        if (DeviceAdminModule) {
          const sessionInfo = await DeviceAdminModule.getSessionInfo();
          if (isMounted) {
            setIsBlockingActive(sessionInfo?.isActive ?? false);
            if (sessionInfo?.isActive) {
              setRemainingTime(sessionInfo.remainingMs);
              setSessionNoTimeLimit(sessionInfo.noTimeLimit ?? false);
            } else {
              setRemainingTime(null);
              setSessionNoTimeLimit(false);
            }
          }
        }
      } catch {
        if (isMounted) {
          setIsBlockingActive(false);
          setRemainingTime(null);
          setSessionNoTimeLimit(false);
        }
      }
    };

    const initializeAll = async () => {
      console.log('=== INITIALIZING NFC SCREEN ===');

      // First load the critical data before enabling NFC detection
      console.log('Loading stored data...');
      await Promise.all([
        loadRegisteredTagInline(),
        loadTapConfigInline(),
        loadInstalledAppsInline(),
      ]);
      console.log('Data loaded. Tag:', registeredTagIdRef.current ? 'SET' : 'NULL', 'Config:', savedConfigRef.current ? 'SET' : 'NULL');

      // Wait a tick to ensure handler effect has run
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      // Now initialize NFC
      try {
        const supported = await NfcManager.isSupported();
        if (!isMounted) return;

        setNfcSupported(supported);
        if (supported) {
          await NfcManager.start();
          nfcInitialized = true;
          console.log('NFC started successfully');

          // Tell native that React is handling NFC
          try {
            await NfcConfigModule?.setReactNfcEnabled(true);
            console.log('React NFC enabled in native');
          } catch (e) {
            console.log('Failed to enable React NFC:', e);
          }

          // Set up foreground tag detection with stable handler
          NfcManager.setEventListener(NfcEvents.DiscoverTag, stableTagHandler);
          console.log('Event listener set');

          // Enable foreground dispatch to catch tags automatically
          await NfcManager.registerTagEvent();
          console.log('NFC tag event registered successfully');
        }
      } catch (error) {
        console.error('NFC init error:', error);
      }
    };

    initializeAll();
    checkBypassInline();
    checkBlockingStatusInline();

    // Check blocking status periodically
    statusIntervalId = setInterval(checkBlockingStatusInline, 1000);

    return () => {
      isMounted = false;
      if (statusIntervalId) clearInterval(statusIntervalId);
      if (nfcInitialized) {
        console.log('Cleaning up NFC...');
        NfcConfigModule?.setReactNfcEnabled(false).catch(() => {});
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        NfcManager.unregisterTagEvent().catch(() => {});
      }
    };
  }, [stableTagHandler, userEmail]); // Include userEmail since it's used in loading

  const filterEssentialApps = useCallback((apps: InstalledApp[]) => {
    return apps.filter(app => !ESSENTIAL_APPS.includes(app.id));
  }, []);

  const loadInstalledApps = useCallback(async () => {
    // Set fallback immediately so there's always something available
    const fallback = filterEssentialApps(FALLBACK_APPS);
    setInstalledApps(fallback);
    installedAppsRef.current = fallback;

    try {
      setLoadingApps(true);
      if (InstalledAppsModule) {
        const apps = await InstalledAppsModule.getInstalledApps();
        if (apps?.length > 0) {
          const filtered = filterEssentialApps(apps);
          setInstalledApps(filtered);
          installedAppsRef.current = filtered;
          console.log('Loaded', filtered.length, 'installed apps');
        }
      }
    } catch (error) {
      console.error('Error loading installed apps:', error);
      // Keep fallback apps
    } finally {
      setLoadingApps(false);
    }
  }, [filterEssentialApps]);

  const checkBypass = useCallback(async () => {
    if (TEMP_BYPASS_ENABLED) {
      const bypass = await AsyncStorage.getItem(TEMP_BYPASS_KEY);
      setHasBypass(bypass === 'true');
    }
  }, []);

  const checkBlockingStatus = useCallback(async () => {
    try {
      if (DeviceAdminModule) {
        const sessionInfo = await DeviceAdminModule.getSessionInfo();
        setIsBlockingActive(sessionInfo?.isActive ?? false);
        if (sessionInfo?.isActive) {
          setRemainingTime(sessionInfo.remainingMs);
          setSessionNoTimeLimit(sessionInfo.noTimeLimit ?? false);
        } else {
          setRemainingTime(null);
          setSessionNoTimeLimit(false);
        }
      }
    } catch {
      setIsBlockingActive(false);
      setRemainingTime(null);
      setSessionNoTimeLimit(false);
    }
  }, []);

  const enableBypass = useCallback(async () => {
    await AsyncStorage.setItem(TEMP_BYPASS_KEY, 'true');
    setHasBypass(true);
  }, []);


  const saveTapConfig = useCallback(async () => {
    console.log('=== SAVING TAP CONFIG ===');
    console.log('configMode:', configMode);
    console.log('noTimeLimit:', noTimeLimit);
    console.log('timer:', timerDays, 'd', timerHours, 'h', timerMinutes, 'm');
    console.log('blockSettings:', blockSettings);
    console.log('selectedApps count:', selectedApps.length);
    console.log('blockedWebsites:', blockedWebsites);

    if (!configMode) {
      console.log('ABORT: No config mode');
      Alert.alert('Error', 'Please select a blocking mode.');
      return;
    }

    const totalMinutes = timerDays * 24 * 60 + timerHours * 60 + timerMinutes;

    // Treat timer=0 as "no time limit" automatically (user can unlock anytime with card)
    const effectiveNoTimeLimit = noTimeLimit || totalMinutes === 0;

    if (configMode === 'specific' && selectedApps.length === 0) {
      console.log('ABORT: Specific mode but no apps selected');
      Alert.alert('Error', 'Please select at least one app to block.');
      return;
    }

    const config: TapConfig = {
      mode: configMode,
      selectedApps: configMode === 'all' ? [] : selectedApps,
      blockedWebsites,
      timerDays,
      timerHours,
      timerMinutes,
      blockSettings,
      noTimeLimit: effectiveNoTimeLimit,
    };

    console.log('Effective noTimeLimit:', effectiveNoTimeLimit);

    try {
      // Save to Supabase
      await saveUserSettings(userEmail, config as TapSettings);
      console.log('Config saved to Supabase');

      // Also save to AsyncStorage for native module sync
      await AsyncStorage.setItem(TAP_CONFIG_KEY, JSON.stringify(config));
      console.log('Config synced to AsyncStorage for native module');

      // Update state and ref
      setSavedConfig(config);
      savedConfigRef.current = config;
      console.log('Config state and ref updated');

      // Save native-friendly config for MainActivity
      const durationMs = effectiveNoTimeLimit ? Number.MAX_SAFE_INTEGER : totalMinutes * 60 * 1000;

      // Use installedApps from ref to ensure we have the latest data
      const currentApps = installedAppsRef.current;
      const appsToBlock = configMode === 'all'
        ? currentApps.map(app => app.id)
        : selectedApps;

      // Add Settings if blockSettings is enabled
      const finalApps = blockSettings
        ? [...appsToBlock, ...SETTINGS_PACKAGES]
        : appsToBlock;

      const nativeConfig = {
        blockedApps: finalApps,
        blockedWebsites,
        durationMs,
        noTimeLimit: effectiveNoTimeLimit,
      };

      console.log('Native config to save:', JSON.stringify(nativeConfig).substring(0, 200));
      console.log('Apps to block count:', finalApps.length);

      // Await the native config save
      try {
        await NfcConfigModule?.setTapConfig(JSON.stringify(nativeConfig));
        console.log('Native config saved successfully');
      } catch (e) {
        console.error('Failed to save native config:', e);
      }

      setShowConfigModal(false);
      console.log('=== CONFIG SAVE COMPLETE ===');

      // Show confirmation
      Vibration.vibrate(100);
    } catch (error) {
      console.error('Failed to save config:', error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    }
  }, [configMode, noTimeLimit, timerDays, timerHours, timerMinutes, selectedApps, blockedWebsites, blockSettings, userEmail]);

  const toggleAppSelection = useCallback((appId: string) => {
    setSelectedApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  }, []);

  const cancelScan = useCallback(() => {
    isCancelling.current = true;
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setShowScanModal(false);
    setTimeout(() => { isCancelling.current = false; }, 100);
  }, []);

  const formatDuration = useCallback((config: TapConfig): string => {
    if (config.noTimeLimit) return 'No time limit';
    if (config.targetDate) {
      const date = new Date(config.targetDate);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Until ${dateStr} at ${timeStr}`;
    }
    const parts = [];
    if (config.timerDays > 0) parts.push(`${config.timerDays}d`);
    if (config.timerHours > 0) parts.push(`${config.timerHours}h`);
    if (config.timerMinutes > 0) parts.push(`${config.timerMinutes}m`);
    return parts.join(' ') || '0m';
  }, []);

  const formatCountdown = useCallback((ms: number): string => {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, []);

  // Open registration modal - disable NFCScreen's NFC handling while modal is open
  const startRegisterCard = useCallback(async () => {
    console.log('=== OPENING REGISTER CARD MODAL ===');
    // Set flags to prevent NFCScreen's tag handler from processing
    nfcOperationLockRef.current = true;
    isRegisteringRef.current = true;

    // Unregister NFCScreen's tag event - RegisterCardModal will handle NFC
    await NfcManager.unregisterTagEvent().catch(() => {});
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);

    setShowRegisterModal(true);
  }, []);

  // Called when registration succeeds
  const handleRegistrationSuccess = useCallback(async (cardUid: string) => {
    console.log('=== CARD REGISTRATION SUCCESS ===');
    console.log('Registered UID:', formatUidForDisplay(cardUid));

    // Update local state
    setRegisteredTagId(cardUid);
    registeredTagIdRef.current = cardUid;
  }, []);

  // Called when registration modal closes (success or cancel)
  const handleRegistrationClose = useCallback(async () => {
    console.log('=== REGISTER MODAL CLOSED ===');
    setShowRegisterModal(false);

    // Re-enable NFCScreen's NFC handling after a delay
    setTimeout(async () => {
      try {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, stableTagHandler);
        await NfcManager.registerTagEvent();
        console.log('NFC tag event re-registered after registration modal closed');
      } catch (e) {
        console.error('Failed to re-register tag event:', e);
      }

      isRegisteringRef.current = false;
      nfcOperationLockRef.current = false;
    }, 300);
  }, [stableTagHandler]);

  const unregisterCardLocal = useCallback(async () => {
    console.log('=== UNREGISTERING CARD ===');

    // Unregister from Supabase (clears UID and settings from user data)
    if (registeredTagId) {
      const result = await unregisterCard(userEmail);
      if (!result.success) {
        console.error('Failed to unregister card from Supabase:', result.error);
        Alert.alert('Error', 'Failed to unregister card. Please try again.');
        return;
      }
      console.log('Card unregistered from Supabase');
    }

    // Update local state
    setRegisteredTagId(null);
    registeredTagIdRef.current = null;

    // Clear native prefs
    try {
      await NfcConfigModule?.setRegisteredTagId(null);
      console.log('Native registered tag cleared');
    } catch (e) {
      console.error('Failed to clear native tag:', e);
    }

    // Clear local AsyncStorage for native module sync
    await AsyncStorage.removeItem(TAP_CONFIG_KEY);
    setSavedConfig(null);
    savedConfigRef.current = null;

    try {
      await NfcConfigModule?.setTapConfig(null);
      console.log('Native tap config cleared');
    } catch (e) {
      console.error('Failed to clear native config:', e);
    }

    // Reset config state
    setConfigMode(null);
    setSelectedApps([]);
    setBlockedWebsites([]);
    setTimerDays(0);
    setTimerHours(1);
    setTimerMinutes(0);
    setBlockSettings(false);
    setNoTimeLimit(false);

    console.log('Card unregistered and all settings cleared');
  }, [userEmail, registeredTagId]);

  const validateWebsite = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
      setIsWebsiteValid(false);
      return;
    }

    let cleaned = trimmed.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const hasValidTLD = /^[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/i.test(cleaned);
    setIsWebsiteValid(hasValidTLD);
  }, []);

  const handleWebsiteInputChange = useCallback((text: string) => {
    setWebsiteInput(text);
    validateWebsite(text);
  }, [validateWebsite]);

  const handleAddWebsite = useCallback(() => {
    if (!isWebsiteValid) return;

    let site = websiteInput.trim().toLowerCase();
    site = site.replace(/^https?:\/\//, '');
    site = site.replace(/^www\./, '');
    const domainMatch = site.match(/^([^.\/]+)/);
    if (domainMatch) {
      site = domainMatch[1];
    }

    if (site && !blockedWebsites.includes(site)) {
      setBlockedWebsites(prev => [...prev, site]);
      setWebsiteInput('');
      setIsWebsiteValid(false);
    }
  }, [isWebsiteValid, websiteInput, blockedWebsites]);

  const handleRemoveWebsite = useCallback((site: string) => {
    setBlockedWebsites(prev => prev.filter(s => s !== site));
  }, []);

  const handleOpenLockPhone = useCallback(() => {
    setConfigMode('all');
    setShowConfigModal(true);
  }, []);

  const handleOpenSpecificApps = useCallback(() => {
    setConfigMode('specific');
    setShowConfigModal(true);
  }, []);

  // Admin functions for adding new cards
  const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const closeAdminModal = useCallback(() => {
    setShowAdminScanModal(false);
    setAdminScanStatus('ready');
    setLastScannedUid(null);
    setAdminMessage('');
    // Ensure locks are released when closing modal
    isAdminOperationRef.current = false;
    nfcOperationLockRef.current = false;
  }, []);

  // Verification modal handlers for NFC tap activation
  const handleVerifyConfirm = useCallback(async () => {
    if (!pendingActivation) return;

    setShowVerifyModal(false);
    Vibration.vibrate([0, 300, 100, 300]);

    try {
      await activateBlockingSession(pendingActivation.settings, pendingActivation.apps);
      console.log('Blocking session activated successfully after verification');
    } catch (err) {
      console.error('Error activating blocking session:', err);
      Alert.alert('Error', 'Failed to activate blocking session.');
    } finally {
      setPendingActivation(null);
    }
  }, [pendingActivation, activateBlockingSession]);

  const handleVerifyCancel = useCallback(() => {
    setShowVerifyModal(false);
    setPendingActivation(null);
    Vibration.vibrate([0, 50]);
  }, []);

  // Add UID to valid whitelist (admin only)
  const addUidToWhitelist = useCallback(async () => {
    // Prevent concurrent operations
    if (nfcOperationLockRef.current) {
      console.log('NFC operation already in progress, skipping add UID');
      return;
    }

    try {
      // Lock NFC operations and mark as admin operation
      nfcOperationLockRef.current = true;
      isAdminOperationRef.current = true;

      setAdminScanStatus('scanning');
      setAdminMessage('Tap card to add UID to whitelist...');
      setShowAdminScanModal(true);

      await NfcManager.unregisterTagEvent().catch(() => {});

      // Read the card UID
      let cardUid: string | null = null;

      try {
        await NfcManager.requestTechnology(NfcTech.NfcA);
        const tag = await NfcManager.getTag();
        cardUid = tag?.id || null;
      } catch {
        // Try Ndef if NfcA fails
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        try {
          await NfcManager.requestTechnology(NfcTech.Ndef);
          const tag = await NfcManager.getTag();
          cardUid = tag?.id || null;
        } catch {
          setAdminScanStatus('error');
          setAdminMessage('Failed to read card.\nTry again.');
          Vibration.vibrate([0, 100, 50, 100]);
          return;
        }
      }

      if (!cardUid) {
        setAdminScanStatus('error');
        setAdminMessage('Failed to read card UID.\nTry again.');
        Vibration.vibrate([0, 100, 50, 100]);
        return;
      }

      console.log('Card scanned for whitelist, UID:', cardUid);
      setLastScannedUid(cardUid);

      // Add to whitelist (pass userEmail for admin verification)
      const result = await addCardToWhitelist(cardUid, userEmail);

      if (result.success) {
        setAdminScanStatus('success');
        setAdminMessage(`UID added to whitelist!\n${formatUidForDisplay(cardUid)}`);
        Vibration.vibrate([0, 200, 100, 200]);
        console.log('UID added to whitelist:', formatUidForDisplay(cardUid));
      } else if (result.alreadyExists) {
        setAdminScanStatus('exists');
        setAdminMessage(`UID already in whitelist.\n${formatUidForDisplay(cardUid)}`);
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        setAdminScanStatus('error');
        setAdminMessage(result.error || 'Failed to add UID.');
        Vibration.vibrate([0, 100, 50, 100]);
      }
    } catch (error) {
      console.error('Add UID to whitelist error:', error);
      setAdminScanStatus('error');
      setAdminMessage('Failed to add UID.\nTry again.');
      Vibration.vibrate([0, 100, 50, 100]);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      try {
        await NfcManager.unregisterTagEvent().catch(() => {});
        NfcManager.setEventListener(NfcEvents.DiscoverTag, stableTagHandler);
        await NfcManager.registerTagEvent();
        console.log('NFC tag event re-registered after addUidToWhitelist');
      } catch (e) {
        console.error('Failed to re-register tag event:', e);
      }
      // Release locks after a small delay
      setTimeout(() => {
        isAdminOperationRef.current = false;
        nfcOperationLockRef.current = false;
        console.log('NFC locks released after addUidToWhitelist');
      }, 300);
    }
  }, [stableTagHandler]);

  const initializeCard = useCallback(async () => {
    // Prevent concurrent operations
    if (nfcOperationLockRef.current) {
      console.log('NFC operation already in progress, skipping initialize');
      return;
    }

    try {
      // Lock NFC operations and mark as admin operation
      nfcOperationLockRef.current = true;
      isAdminOperationRef.current = true;

      setAdminScanStatus('scanning');
      setAdminMessage('Hold card to initialize...');
      setShowAdminScanModal(true);

      await NfcManager.unregisterTagEvent().catch(() => {});

      // Try Ndef first to check if card already has NDEF data
      let hasExistingScuteRecord = false;
      let cardUid: string | null = null;

      try {
        await NfcManager.requestTechnology(NfcTech.Ndef);

        // Check if card already has Scute NDEF record
        const tag = await NfcManager.getTag();
        cardUid = tag?.id || null;

        if (tag?.ndefMessage) {
          for (const record of tag.ndefMessage) {
            // Check for our custom URI record
            if (record.tnf === 1) { // Well-known type
              const typeStr = String.fromCharCode(...((record.type || []) as number[]));
              const payloadBytes = (record.payload || []) as number[];
              const payloadStr = String.fromCharCode(...payloadBytes);
              if (typeStr === 'U' && payloadStr.includes('scute://card')) {
                hasExistingScuteRecord = true;
                break;
              }
            }
          }
        }
      } catch {
        // Card doesn't have NDEF, needs formatting
        await NfcManager.requestTechnology(NfcTech.NdefFormatable);
        const tag = await NfcManager.getTag();
        cardUid = tag?.id || null;
      }

      if (hasExistingScuteRecord) {
        setAdminScanStatus('exists');
        setAdminMessage('Card already initialized!\nNo need to initialize again.');
        Vibration.vibrate([0, 100, 50, 100]);
        console.log('Card already has Scute NDEF record');
        return;
      }

      // Create custom NDEF URI record for Scute with custom scheme
      const uriRecord = Ndef.uriRecord('scute://card');
      const message = Ndef.encodeMessage([uriRecord]);

      if (message) {
        await NfcManager.ndefHandler.writeNdefMessage(message);
      }

      console.log('Card initialized with Scute NDEF record');

      setAdminScanStatus('success');
      setAdminMessage('Card initialized!\nWill now open Scute directly.');
      Vibration.vibrate([0, 200, 100, 200]);
    } catch (error) {
      console.error('Initialize card error:', error);
      setAdminScanStatus('error');
      setAdminMessage('Failed to initialize card.\nTry again.');
      Vibration.vibrate([0, 100, 50, 100]);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      try {
        await NfcManager.unregisterTagEvent().catch(() => {});
        NfcManager.setEventListener(NfcEvents.DiscoverTag, stableTagHandler);
        await NfcManager.registerTagEvent();
        console.log('NFC tag event re-registered after initializeCard');
      } catch (e) {
        console.error('Failed to re-register tag event:', e);
      }
      // Release locks after a small delay
      setTimeout(() => {
        isAdminOperationRef.current = false;
        nfcOperationLockRef.current = false;
        console.log('NFC locks released after initializeCard');
      }, 300);
    }
  }, [stableTagHandler]);


  // Can only configure if card is registered/bypassed AND phone is not locked
  const canConfigure = (registeredTagId || hasBypass) && !isBlockingActive;

  if (nfcSupported === null) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666' }}>Checking NFC support...</Text>
      </SafeAreaView>
    );
  }

  if (!nfcSupported) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>NFC is not supported on this device</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackButton onPress={onBack} />

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Scute Card</Text>
        <Text style={{ color: '#666', marginBottom: 24 }}>NTAG424 DNA Secured</Text>

        {/* Admin Panel - Only visible to admin */}
        {isAdmin && (
          <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#fff3e0', borderRadius: 12, borderWidth: 1, borderColor: '#ff9800' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#e65100' }}>Admin Panel</Text>
              <View style={{ marginLeft: 8, backgroundColor: '#ff9800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>ADMIN</Text>
              </View>
            </View>
            <Text style={{ color: '#666', marginBottom: 12 }}>
              Manage Scute cards before shipping
            </Text>
            <TouchableOpacity
              onPress={addUidToWhitelist}
              style={{
                backgroundColor: '#2196f3',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Add UID to Whitelist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={initializeCard}
              style={{
                backgroundColor: '#4caf50',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Initialize Card (NDEF)</Text>
            </TouchableOpacity>
          </View>
        )}

        {!registeredTagId ? (
          <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Register Your Card</Text>
            <Text style={{ color: '#666', marginBottom: 16 }}>
              Hold your Scute card near your phone to verify and register it
            </Text>
            <Button title="Register Card" onPress={startRegisterCard} fullWidth />
            {TEMP_BYPASS_ENABLED && !hasBypass && (
              <TouchableOpacity onPress={enableBypass} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#007AFF' }}>Enable Temporary Bypass (Dev)</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ marginBottom: 24, padding: 16, backgroundColor: isBlockingActive ? '#ffebee' : '#e8f5e9', borderRadius: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>
                {isBlockingActive ? 'Phone Locked' : 'Card Registered ✓'}
              </Text>
              {isBlockingActive && (
                <View style={{ alignItems: 'flex-end' }}>
                  {!sessionNoTimeLimit && remainingTime !== null && remainingTime > 0 && (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#d32f2f', marginBottom: 4 }}>
                      {formatCountdown(remainingTime)}
                    </Text>
                  )}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ff5722',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>LOCKED</Text>
                  </View>
                </View>
              )}
            </View>
            <Text style={{ color: '#666', marginBottom: 12 }}>
              {isBlockingActive
                ? (sessionNoTimeLimit
                    ? 'Phone is currently locked. Tap your card to unlock.'
                    : 'Phone is locked until timer expires.')
                : 'Tap your card anytime to activate blocking'}
            </Text>
            {!isBlockingActive && (
              <TouchableOpacity onPress={unregisterCardLocal} style={{ padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#ff4444' }}>Unregister Card</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Show locked message when blocking is active */}
        {isBlockingActive && (registeredTagId || hasBypass) && (
          <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#ffebee', borderRadius: 12, borderWidth: 1, borderColor: '#ff5722' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#d32f2f', marginBottom: 8 }}>Settings Locked</Text>
            <Text style={{ color: '#666' }}>
              Configuration is locked while your phone is blocked. Tap your card to unlock and access settings.
            </Text>
          </View>
        )}

        {canConfigure && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Tap Configuration</Text>

            {savedConfig && (
              <View style={{ padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Current Settings</Text>
                <Text style={{ color: '#666' }}>
                  Mode: {savedConfig.mode === 'all' ? 'Block All Apps' : `Block ${savedConfig.selectedApps.length} Apps`}
                </Text>
                {savedConfig.blockedWebsites?.length > 0 && (
                  <Text style={{ color: '#666' }}>Websites: {savedConfig.blockedWebsites.length} blocked</Text>
                )}
                {(savedConfig.noTimeLimit || (savedConfig.timerDays === 0 && savedConfig.timerHours === 0 && savedConfig.timerMinutes === 0 && !savedConfig.targetDate)) ? (
                  <Text style={{ color: '#007AFF', fontWeight: '600' }}>No time limit</Text>
                ) : (
                  <Text style={{ color: '#666' }}>Duration: {formatDuration(savedConfig)}</Text>
                )}
                {savedConfig.blockSettings && (
                  <Text style={{ color: '#ff9800' }}>Settings app blocked</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={handleOpenLockPhone}
              style={{
                padding: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Lock Entire Phone</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>Lock your phone for a certain period of time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenSpecificApps}
              style={{
                padding: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Specific Apps</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>Choose which apps to block when you tap your Scute</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ConfigModal
        visible={showConfigModal}
        configMode={configMode}
        selectedApps={selectedApps}
        blockedWebsites={blockedWebsites}
        websiteInput={websiteInput}
        isWebsiteValid={isWebsiteValid}
        blockSettings={blockSettings}
        noTimeLimit={noTimeLimit}
        timerDays={timerDays}
        timerHours={timerHours}
        timerMinutes={timerMinutes}
        onClose={() => setShowConfigModal(false)}
        onSave={saveTapConfig}
        onOpenAppSelector={() => setShowAppSelector(true)}
        onWebsiteInputChange={handleWebsiteInputChange}
        onAddWebsite={handleAddWebsite}
        onRemoveWebsite={handleRemoveWebsite}
        onToggleBlockSettings={() => setBlockSettings(prev => !prev)}
        onToggleNoTimeLimit={() => setNoTimeLimit(prev => !prev)}
        onDaysChange={setTimerDays}
        onHoursChange={setTimerHours}
        onMinutesChange={setTimerMinutes}
      />

      <Modal visible={showAppSelector} animationType="slide" presentationStyle="fullScreen">
        <SelectAppsScreen
          apps={installedApps}
          selectedApps={selectedApps}
          loading={loadingApps}
          onToggle={toggleAppSelection}
          onClose={() => setShowAppSelector(false)}
          onSave={() => setShowAppSelector(false)}
        />
      </Modal>

      <NFCScanModal
        visible={showScanModal}
        onCancel={cancelScan}
        translateY={translateY}
        bgFlash={bgFlash}
        shakeAnimation={shakeAnimation}
      />

      {/* Register Card Modal */}
      <RegisterCardModal
        visible={showRegisterModal}
        onClose={handleRegistrationClose}
        onSuccess={handleRegistrationSuccess}
        userEmail={userEmail}
      />

      {/* Admin Scan Modal */}
      <Modal visible={showAdminScanModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 360 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
              Admin: Add Card
            </Text>

            {/* Status indicator */}
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              {adminScanStatus === 'scanning' && (
                <>
                  <ActivityIndicator size="large" color="#ff9800" />
                  <Text style={{ marginTop: 12, color: '#666', textAlign: 'center' }}>{adminMessage}</Text>
                </>
              )}

              {adminScanStatus === 'success' && (
                <>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#4caf50', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, color: '#fff' }}>✓</Text>
                  </View>
                  <Text style={{ marginTop: 16, color: '#4caf50', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                    Success!
                  </Text>
                  <Text style={{ marginTop: 8, color: '#666', textAlign: 'center' }}>
                    {adminMessage}
                  </Text>
                </>
              )}

              {adminScanStatus === 'exists' && (
                <>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2196f3', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, color: '#fff' }}>!</Text>
                  </View>
                  <Text style={{ marginTop: 16, color: '#2196f3', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                    Already in Database
                  </Text>
                  <Text style={{ marginTop: 8, color: '#666', textAlign: 'center' }}>
                    {adminMessage}
                  </Text>
                </>
              )}

              {adminScanStatus === 'error' && (
                <>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f44336', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, color: '#fff' }}>✗</Text>
                  </View>
                  <Text style={{ marginTop: 16, color: '#f44336', textAlign: 'center', fontWeight: '600' }}>
                    {adminMessage}
                  </Text>
                </>
              )}

              {adminScanStatus === 'ready' && (
                <>
                  <ActivityIndicator size="large" color="#ff9800" />
                  <Text style={{ marginTop: 12, color: '#666', textAlign: 'center' }}>Preparing scanner...</Text>
                </>
              )}
            </View>

            {/* Buttons */}
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                onPress={closeAdminModal}
                style={{
                  backgroundColor: '#f5f5f5',
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#333', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Modal for NFC Tap Activation */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="fade"
        onRequestClose={handleVerifyCancel}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden' }}>
            {/* Content */}
            <View style={{ padding: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>
                Enable Preset?
              </Text>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 }}>
                Do you want to enable "{pendingActivation?.presetName || 'this preset'}"?
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={handleVerifyCancel}
                style={{ flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#e0e0e0' }}
              >
                <Text style={{ fontSize: 16, color: '#333' }}>Cancel</Text>
              </TouchableOpacity>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={handleVerifyConfirm}
                style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#007AFF' }}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(NFCScreen);
