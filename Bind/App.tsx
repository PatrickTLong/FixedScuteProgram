import './global.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Vibration, NativeModules, AppState, Animated, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme, animSpeed } from './src/context/ThemeContext';
import LandingScreen from './src/screens/LandingScreen';
import SignInScreen from './src/screens/SignInScreen';
import GetStartedScreen from './src/screens/GetStartedScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import PermissionsChecklistScreen from './src/screens/PermissionsChecklistScreen';
import HomeScreen from './src/screens/HomeScreen';
import PresetsScreen from './src/screens/PresetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TermsAcceptScreen from './src/screens/TermsAcceptScreen';
import BottomTabBar from './src/components/BottomTabBar';
import InfoModal from './src/components/InfoModal';
import EmergencyTapoutModal from './src/components/EmergencyTapoutModal';
import { deleteAccount, updateLockStatus, getPresets, resetPresets, deactivateAllPresets, useEmergencyTapout, savePreset, Preset, EmergencyTapoutStatus, invalidateUserCaches, clearAuthToken, getMembershipStatus } from './src/services/cardApi';
import MembershipScreen from './src/screens/MembershipScreen';

const { BlockingModule, PermissionsModule, ScheduleModule } = NativeModules;

// Track which scheduled preset we've already navigated for (to avoid repeat navigations)
let lastNavigatedScheduledPresetId: string | null = null;

type Screen = 'landing' | 'signin' | 'getstarted' | 'forgotpassword' | 'terms' | 'permissions' | 'membership' | 'main';
type TabName = 'home' | 'presets' | 'settings';

// Static set of auth screens for transition checks - avoids recreating on every render
const AUTH_SCREENS: ReadonlySet<Screen> = new Set(['landing', 'signin', 'getstarted', 'forgotpassword']);

function App() {
  const { colors } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true); // Show loading until we determine which screen

  // Emergency tapout modal state
  const [emergencyTapoutModalVisible, setEmergencyTapoutModalVisible] = useState(false);
  const [tapoutStatus, setTapoutStatus] = useState<EmergencyTapoutStatus | null>(null);
  const [activePresetForTapout, setActivePresetForTapout] = useState<Preset | null>(null);
  const [tapoutLoading, setTapoutLoading] = useState(false);
  const [lockEndsAtForTapout, setLockEndsAtForTapout] = useState<string | null>(null);

  // Force re-render trigger for child components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Screen transition animation (scale up + fade in)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [displayedScreen, setDisplayedScreen] = useState<Screen>('landing');
  const isTransitioning = useRef(false);

  // Tab transition animation (scale up + fade in)
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabScaleAnim = useRef(new Animated.Value(1)).current;
  const [displayedTab, setDisplayedTab] = useState<TabName>('home');
  const isTabTransitioning = useRef(false);

  const showModal = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);


  // Animated screen transition for auth screens (scale up + fade in, no fade-out)
  const changeScreen = useCallback((newScreen: Screen) => {
    const isAuthTransition = AUTH_SCREENS.has(currentScreen) && AUTH_SCREENS.has(newScreen);

    if (isAuthTransition && !isTransitioning.current) {
      isTransitioning.current = true;

      // Instantly swap content, start new screen at scale 0.95 + opacity 0
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      setDisplayedScreen(newScreen);
      setCurrentScreen(newScreen);

      // Animate new screen in: scale 0.95→1 + opacity 0→1
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: animSpeed.tabTransition,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: animSpeed.tabTransition,
            useNativeDriver: true,
          }),
        ]).start(() => {
          isTransitioning.current = false;
        });
      });
    } else {
      setDisplayedScreen(newScreen);
      setCurrentScreen(newScreen);
    }
  }, [currentScreen, fadeAnim, scaleAnim]);

  // Animated tab transition for main tabs (scale up + fade in, no fade-out)
  const changeTab = useCallback((newTab: TabName) => {
    if (newTab === activeTab || isTabTransitioning.current) return;

    isTabTransitioning.current = true;

    // Instantly swap content, start new tab at scale 0.95 + opacity 0
    tabFadeAnim.setValue(0);
    tabScaleAnim.setValue(0.95);
    setActiveTab(newTab);
    setDisplayedTab(newTab);

    // Animate new tab in: scale 0.95→1 + opacity 0→1
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: animSpeed.tabTransition,
          useNativeDriver: true,
        }),
        Animated.timing(tabScaleAnim, {
          toValue: 1,
          duration: animSpeed.tabTransition,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTabTransitioning.current = false;
      });
    });
  }, [activeTab, tabFadeAnim, tabScaleAnim]);

  // Handle using emergency tapout from NFC modal
  const handleUseEmergencyTapout = useCallback(async () => {
    // Check if active preset allows emergency tapout
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
        // Unlock was successful
        setEmergencyTapoutModalVisible(false);

        // Clear native blocking
        if (BlockingModule) {
          await BlockingModule.forceUnlock();
        }

        // Deactivate the active preset so it doesn't automatically re-lock
        if (activePresetForTapout) {
          const deactivatedPreset = { ...activePresetForTapout, isActive: false };
          await savePreset(userEmail, deactivatedPreset);

          // If it's a scheduled preset, cancel its alarm
          if (activePresetForTapout.isScheduled && ScheduleModule) {
            try {
              await ScheduleModule.cancelPresetAlarm(activePresetForTapout.id);
            } catch (e) {
              // Failed to cancel preset alarm
            }
          }
        }

        // Update database
        await updateLockStatus(userEmail, false, null);

        // Invalidate caches so screens get fresh data
        invalidateUserCaches(userEmail);

        Vibration.vibrate(100);
        showModal('Unlocked', `Phone unlocked. You have ${result.remaining} emergency tapout${result.remaining !== 1 ? 's' : ''} remaining.`);

        // Trigger refresh
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

  useEffect(() => {
    checkLoginStatus();
    checkScheduledPresetLaunch();
    checkBlockedOverlayLaunch();
  }, []);

  // Check if any scheduled preset is currently active and navigate to home if so
  const checkActiveScheduledPreset = useCallback(async () => {
    // Only check if user is logged in and on main screen
    if (!userEmail || currentScreen !== 'main') return;

    try {
      const presets = await getPresets(userEmail);
      const now = Date.now();

      // Find any scheduled preset that's currently in its active window
      for (const preset of presets) {
        if (!preset.isScheduled || !preset.isActive) continue;
        if (!preset.scheduleStartDate || !preset.scheduleEndDate) continue;

        const startTime = new Date(preset.scheduleStartDate).getTime();
        const endTime = new Date(preset.scheduleEndDate).getTime();

        // Is current time within the schedule window?
        if (now >= startTime && now < endTime) {
          // Only navigate if we haven't already for this preset
          if (lastNavigatedScheduledPresetId !== preset.id) {
            lastNavigatedScheduledPresetId = preset.id;

            // Invalidate caches to ensure HomeScreen gets fresh data
            invalidateUserCaches(userEmail);

            // Navigate to home tab and trigger refresh
            setActiveTab('home'); setDisplayedTab('home');
            setRefreshTrigger(prev => prev + 1);
          }
          return; // Found an active preset, no need to check more
        }
      }

      // No active scheduled preset found - clear the tracker so we can navigate again for future presets
      lastNavigatedScheduledPresetId = null;
    } catch (error) {
      // Error checking active scheduled preset
    }
  }, [userEmail, currentScreen]);

  // Check if app was launched from a scheduled preset alarm
  const checkScheduledPresetLaunch = useCallback(async () => {
    try {
      if (!ScheduleModule) return;

      const launchData = await ScheduleModule.getScheduledLaunchData();
      if (launchData?.launched) {
        // Clear the launch data so we don't process it again
        await ScheduleModule.clearScheduledLaunchData();

        // Invalidate caches to get fresh data
        if (userEmail) {
          invalidateUserCaches(userEmail);
        }

        // If user is logged in and on main screen, ensure we're on home tab with fresh data
        if (currentScreen === 'main') {
          setActiveTab('home'); setDisplayedTab('home');
          setRefreshTrigger(prev => prev + 1); // Trigger refresh
        }
      }
    } catch (error) {
      // Error checking scheduled launch
    }
  }, [currentScreen, userEmail]);

  // Check if app was launched from blocked overlay (tap to dismiss)
  const checkBlockedOverlayLaunch = useCallback(async () => {
    try {
      if (!ScheduleModule) return;

      const launchData = await ScheduleModule.getBlockedOverlayLaunchData();
      if (launchData?.fromBlockedOverlay) {
        // If user is logged in and on main screen, ensure we're on home tab
        if (currentScreen === 'main') {
          setActiveTab('home'); setDisplayedTab('home');
          setRefreshTrigger(prev => prev + 1); // Trigger refresh
        }
      }
    } catch (error) {
      // Error checking blocked overlay launch
    }
  }, [currentScreen]);

  // Check permissions when app comes to foreground
  const checkPermissionsOnForeground = useCallback(async () => {
    // Only check if user is logged in and on main screen
    if (!userEmail || currentScreen !== 'main') return;

    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        // Check if any required permission is missing
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'deviceAdmin'];
        const missingPermission = requiredPermissions.some(perm => !states[perm]);

        if (missingPermission) {
          // Navigate to permissions screen
          setDisplayedScreen('permissions');
          setCurrentScreen('permissions');
        }
      }
    } catch (error) {
      // Failed to check permissions
    }
  }, [userEmail, currentScreen]);

  // Listen for app state changes to check permissions and scheduled launches
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissionsOnForeground();
        // Check if app was brought to foreground by a scheduled preset alarm
        checkScheduledPresetLaunch();
        // Check if app was brought to foreground from blocked overlay (tap to dismiss)
        checkBlockedOverlayLaunch();
        // Check if any scheduled preset is now active
        checkActiveScheduledPreset();
      }
    });

    return () => subscription.remove();
  }, [checkPermissionsOnForeground, checkScheduledPresetLaunch, checkBlockedOverlayLaunch, checkActiveScheduledPreset]);

  // Listen for native session events (scheduled preset start/end, timer end)
  // Replaces polling - fires instantly when a session starts or ends
  useEffect(() => {
    if (!userEmail || currentScreen !== 'main') return;

    // Check once on mount/screen change
    checkActiveScheduledPreset();

    const subscription = DeviceEventEmitter.addListener('onSessionChanged', () => {
      // Invalidate caches to ensure fresh data
      invalidateUserCaches(userEmail);

      // Navigate to home tab and trigger refresh
      setActiveTab('home');
      setDisplayedTab('home');
      setRefreshTrigger(prev => prev + 1);
    });

    return () => subscription.remove();
  }, [userEmail, currentScreen, checkActiveScheduledPreset]);

  async function checkLoginStatus() {
    const email = await AsyncStorage.getItem('user_email');

    if (email) {
      setIsLoggedIn(true);
      setUserEmail(email);

      // Check if ToS has been accepted
      const tosAccepted = await AsyncStorage.getItem('tos_accepted');
      if (tosAccepted !== 'true') {
        // Show Terms of Service screen first
        setDisplayedScreen('terms');
        setCurrentScreen('terms');
        setIsInitializing(false);
        return;
      }

      // Check if all permissions are already granted before showing permissions screen
      try {
        if (PermissionsModule) {
          const states = await PermissionsModule.checkAllPermissions();
          const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'batteryOptimization', 'deviceAdmin'];
          const allGranted = requiredPermissions.every(perm => states[perm]);

          if (allGranted) {
            // All permissions granted, check membership status
            try {
              const membership = await getMembershipStatus(email, true);
              if (membership.trialExpired && !membership.isMember) {
                // Trial expired, deactivate presets and show membership screen
                await deactivateAllPresets(email);
                await ScheduleModule?.saveScheduledPresets('[]');
                setDisplayedScreen('membership');
                setCurrentScreen('membership');
                setIsInitializing(false);
                return;
              }
            } catch (error) {
              // Error checking membership, proceed to main
            }
            setDisplayedScreen('main');
            setCurrentScreen('main');
            setIsInitializing(false);
            return;
          }
        }
      } catch (error) {
        // Error checking permissions
      }

      // Permissions not all granted or check failed, show permissions screen
      setDisplayedScreen('permissions');
      setCurrentScreen('permissions');
    }
    setIsInitializing(false);
  }

  const handleLogin = useCallback(async (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    await AsyncStorage.setItem('user_email', email);

    // Check if ToS has been accepted
    const tosAccepted = await AsyncStorage.getItem('tos_accepted');
    if (tosAccepted !== 'true') {
      // Show Terms of Service screen first
      setDisplayedScreen('terms');
      setCurrentScreen('terms');
      return;
    }

    // Check if all permissions are already granted before showing permissions screen
    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'alarms', 'deviceAdmin'];
        const allGranted = requiredPermissions.every(perm => states[perm]);

        if (allGranted) {
          // All permissions granted, check membership status
          try {
            const membership = await getMembershipStatus(email, true);
            if (membership.trialExpired && !membership.isMember) {
              // Trial expired, deactivate presets and show membership screen
              await deactivateAllPresets(email);
              await ScheduleModule?.saveScheduledPresets('[]');
              setDisplayedScreen('membership');
              setCurrentScreen('membership');
              return;
            }
          } catch (error) {
            // Error checking membership, proceed to main
          }
          setDisplayedScreen('main');
          setCurrentScreen('main');
          return;
        }
      }
    } catch (error) {
      // Error checking permissions
    }

    // Permissions not all granted or check failed, show permissions screen
    setDisplayedScreen('permissions');
    setCurrentScreen('permissions');
  }, []);

  const handleTermsAccepted = useCallback(async () => {
    // ToS accepted, now check permissions
    try {
      if (PermissionsModule) {
        const states = await PermissionsModule.checkAllPermissions();
        const requiredPermissions = ['notification', 'accessibility', 'usageAccess', 'displayOverlay', 'postNotifications', 'alarms', 'deviceAdmin'];
        const allGranted = requiredPermissions.every(perm => states[perm]);

        if (allGranted) {
          // All permissions granted, check membership status
          try {
            const membership = await getMembershipStatus(userEmail, true);
            if (membership.trialExpired && !membership.isMember) {
              // Trial expired, deactivate presets and show membership screen
              await deactivateAllPresets(userEmail);
              await ScheduleModule?.saveScheduledPresets('[]');
              setDisplayedScreen('membership');
              setCurrentScreen('membership');
              return;
            }
          } catch (error) {
            // Error checking membership, proceed to main
          }
          setDisplayedScreen('main');
          setCurrentScreen('main');
          return;
        }
      }
    } catch (error) {
      // Error checking permissions
    }

    // Permissions not all granted or check failed, show permissions screen
    setDisplayedScreen('permissions');
    setCurrentScreen('permissions');
  }, [userEmail]);

  const handlePermissionsComplete = useCallback(async () => {
    // Check membership status before going to main
    try {
      const membership = await getMembershipStatus(userEmail, true);
      if (membership.trialExpired && !membership.isMember) {
        // Trial expired, deactivate presets and show membership screen
        await deactivateAllPresets(userEmail);
        await ScheduleModule?.saveScheduledPresets('[]');
        setDisplayedScreen('membership');
        setCurrentScreen('membership');
        return;
      }
    } catch (error) {
      // Error checking membership, proceed to main
    }
    setDisplayedScreen('main');
    setCurrentScreen('main');
  }, [userEmail]);

  const handleMembershipComplete = useCallback(() => {
    setDisplayedScreen('main');
    setCurrentScreen('main');
  }, []);

  const handleLogout = useCallback(async () => {
    // Deactivate all active presets before logging out (same as PresetsScreen untoggle)
    if (userEmail) {
      await deactivateAllPresets(userEmail);
      // Clear all scheduled alarms from native side
      await ScheduleModule?.saveScheduledPresets('[]');
    }
    await AsyncStorage.removeItem('user_email');
    await clearAuthToken();
    setIsLoggedIn(false);
    setUserEmail('');
    setDisplayedScreen('landing');
    setCurrentScreen('landing');
    setActiveTab('home'); setDisplayedTab('home');
  }, [userEmail]);

  const handleResetAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Reset presets and settings but keep user logged in
    try {
      // Clear all scheduled alarms from native side before deleting presets
      await ScheduleModule?.saveScheduledPresets('[]');

      // Call API to delete all presets and recreate defaults (Supabase is source of truth)
      const result = await resetPresets(userEmail);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to reset presets' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset account' };
    }
  }, [userEmail]);

  const handleDeleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Delete account from Supabase and clear everything locally
    // This deletes from users and user_cards tables, NOT the whitelist
    try {
      // Clear all scheduled alarms from native side before deleting account
      await ScheduleModule?.saveScheduledPresets('[]');

      const result = await deleteAccount(userEmail);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to delete account' };
      }
      // Clear all local storage and return to onboarding
      await AsyncStorage.clear();
      setIsLoggedIn(false);
      setUserEmail('');
      setDisplayedScreen('landing');
      setCurrentScreen('landing');
      setActiveTab('home'); setDisplayedTab('home');
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete account' };
    }
  }, [userEmail]);

  const renderScreen = () => {
    // Show blank screen while checking login status and permissions
    if (isInitializing) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg }} />
      );
    }

    // Auth screens use animated transitions
    const isAuthScreen = AUTH_SCREENS.has(displayedScreen);

    const screenContent = (() => {
      switch (displayedScreen) {
        case 'landing':
          return (
            <LandingScreen
              onGetStarted={() => changeScreen('getstarted')}
            />
          );
        case 'signin':
          return (
            <SignInScreen
              onBack={() => changeScreen('getstarted')}
              onSuccess={handleLogin}
              onForgotPassword={() => changeScreen('forgotpassword')}
            />
          );
        case 'getstarted':
          return (
            <GetStartedScreen
              onBack={() => changeScreen('landing')}
              onSuccess={handleLogin}
              onSignIn={() => changeScreen('signin')}
            />
          );
          case 'forgotpassword':
          return (
            <ForgotPasswordScreen
              onBack={() => changeScreen('signin')}
              onSuccess={() => changeScreen('signin')}
            />
          );
        case 'terms':
          return (
            <TermsAcceptScreen
              onAccept={handleTermsAccepted}
            />
          );
        case 'permissions':
          return (
            <PermissionsChecklistScreen
              onComplete={handlePermissionsComplete}
            />
          );
        case 'membership':
          return (
            <MembershipScreen
              onPurchaseComplete={handleMembershipComplete}
            />
          );
        case 'main':
          return (
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <Animated.View renderToHardwareTextureAndroid={true} style={{ flex: 1, backgroundColor: colors.bg, opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }}>
                {displayedTab === 'home' && (
                  <HomeScreen
                    email={userEmail}
                    onNavigateToPresets={() => changeTab('presets')}
                    refreshTrigger={refreshTrigger}
                  />
                )}
                {displayedTab === 'presets' && (
                  <PresetsScreen
                    userEmail={userEmail}
                  />
                )}
                {displayedTab === 'settings' && (
                  <SettingsScreen
                    email={userEmail}
                    onLogout={handleLogout}
                    onResetAccount={handleResetAccount}
                    onDeleteAccount={handleDeleteAccount}
                  />
                )}
              </Animated.View>
              <BottomTabBar
                activeTab={activeTab}
                onTabPress={changeTab}
              />
            </View>
          );
        default:
          return <LandingScreen onGetStarted={() => {}} />;
      }
    })();

    // Wrap auth screens with animated view for smooth transitions
    // Use themed background color so transitions look correct in both light and dark mode
    if (isAuthScreen) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <Animated.View renderToHardwareTextureAndroid={true} style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            {screenContent}
          </Animated.View>
        </View>
      );
    }

    return screenContent;
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
      <InfoModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
      <EmergencyTapoutModal
        visible={emergencyTapoutModalVisible}
        onClose={() => setEmergencyTapoutModalVisible(false)}
        onUseTapout={handleUseEmergencyTapout}
        presetAllowsTapout={!!activePresetForTapout?.allowEmergencyTapout}
        tapoutsRemaining={tapoutStatus?.remaining ?? 0}
        isLoading={tapoutLoading}
        lockEndsAt={lockEndsAtForTapout}
      />
    </SafeAreaProvider>
  );
}

// Wrap App with ThemeProvider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;
