import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Linking,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import SlideUpModal from '../components/SlideUpModal';
import HourglassLoader from '../components/HourglassLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CheckCircleIcon } from 'phosphor-react-native';
import ReplyArrowIcon from '../components/ReplyArrowIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import HeaderIconButton from '../components/HeaderIconButton';
import MembershipContent from '../components/MembershipContent';
import { getMembershipStatus, MembershipStatus, getCachedMembershipStatus } from '../services/cardApi';
import { useTheme, colors as themeColors, textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';



// Icons
const MailIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M200,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24ZM96,48h64a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16Zm84.81,150.4a8,8,0,0,1-11.21-1.6,52,52,0,0,0-83.2,0,8,8,0,1,1-12.8-9.6A67.88,67.88,0,0,1,101,165.51a40,40,0,1,1,53.94,0A67.88,67.88,0,0,1,182.4,187.2,8,8,0,0,1,180.81,198.4ZM152,136a24,24,0,1,1-24-24A24,24,0,0,1,152,136Z" />
  </Svg>
);

const MembershipIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z" />
  </Svg>
);

const LogoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M200,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24Zm-40,80h40v24H160Zm-48,40h88v24H112Zm88,72H56V184H200v32Z" />
  </Svg>
);

const RefreshIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.13 17.13c-.15.18-.31.36-.48.52-.73.74-1.59 1.31-2.54 1.71-1.97.83-4.26.83-6.23 0-.95-.4-1.81-.98-2.54-1.72a7.8 7.8 0 0 1-1.71-2.54c-.42-.99-.63-2.03-.63-3.11H2c0 1.35.26 2.66.79 3.89.5 1.19 1.23 2.26 2.14 3.18s1.99 1.64 3.18 2.14c1.23.52 2.54.79 3.89.79s2.66-.26 3.89-.79c1.19-.5 2.26-1.23 3.18-2.14.17-.17.32-.35.48-.52L22 20.99v-6h-6l2.13 2.13Zm.94-12.2a9.9 9.9 0 0 0-3.18-2.14 10.12 10.12 0 0 0-7.79 0c-1.19.5-2.26 1.23-3.18 2.14-.17.17-.32.35-.48.52L1.99 3v6h6L5.86 6.87c.15-.18.31-.36.48-.52.73-.74 1.59-1.31 2.54-1.71 1.97-.83 4.26-.83 6.23 0 .95.4 1.81.98 2.54 1.72.74.73 1.31 1.59 1.71 2.54.42.99.63 2.03.63 3.11h2c0-1.35-.26-2.66-.79-3.89-.5-1.19-1.23-2.26-2.14-3.18Z" />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M23.25 23.23a0.75 0.75 0 0 0 0.66 -1.1l-11.25 -21a0.78 0.78 0 0 0 -1.32 0l-11.25 21a0.73 0.73 0 0 0 0 0.74 0.73 0.73 0 0 0 0.64 0.36ZM12 20.48A1.5 1.5 0 1 1 13.5 19a1.5 1.5 0 0 1 -1.5 1.48Zm0 -12.25a1 1 0 0 1 1 1v5.47a1 1 0 0 1 -2 0V9.23a1 1 0 0 1 1 -1Z" />
  </Svg>
);

const MessageIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M16.3 8.51a8.74 8.74 0 0 1 1.37 0.11 0.25 0.25 0 0 0 0.19 0A0.23 0.23 0 0 0 18 8.4l0 -0.65C18 3.75 14.07 0.5 9.25 0.5S0.5 3.75 0.5 7.75a6.52 6.52 0 0 0 2.25 4.85L1 15.58a0.52 0.52 0 0 0 0.06 0.58 0.5 0.5 0 0 0 0.56 0.13l4.48 -1.77a11.72 11.72 0 0 0 1.42 0.34 0.26 0.26 0 0 0 0.29 -0.19 8.65 8.65 0 0 1 8.49 -6.16Z" />
    <Path d="M16.3 10c-3.9 0 -7.19 2.86 -7.19 6.24a6.22 6.22 0 0 0 3 5.18 7.15 7.15 0 0 0 6.64 0.62l3.58 1.42a0.56 0.56 0 0 0 0.68 -0.75l-0.84 -2.95a5.14 5.14 0 0 0 1.37 -3.52C23.5 12.87 20.2 10 16.3 10Z" />
  </Svg>
);

const BugIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M224,120H208V104h16a8,8,0,0,1,0,16ZM32,104a8,8,0,0,0,0,16H48V104Zm176,56c0,2.7-.14,5.37-.4,8H224a8,8,0,0,1,0,16H204.32a80,80,0,0,1-152.64,0H32a8,8,0,0,1,0-16H48.4c-.26-2.63-.4-5.3-.4-8v-8H32a8,8,0,0,1,0-16H48V120H208v16h16a8,8,0,0,1,0,16H208Zm-72-16a8,8,0,0,0-16,0v64a8,8,0,0,0,16,0ZM69.84,57.15A79.76,79.76,0,0,0,48.4,104H207.6a79.76,79.76,0,0,0-21.44-46.85l19.5-19.49a8,8,0,0,0-11.32-11.32l-20.29,20.3a79.74,79.74,0,0,0-92.1,0L61.66,26.34A8,8,0,0,0,50.34,37.66Z" />
  </Svg>
);

const ShieldIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M224,120a40,40,0,0,1-40-40,8,8,0,0,0-8-8,40,40,0,0,1-40-40,8,8,0,0,0-8-8A104,104,0,1,0,232,128,8,8,0,0,0,224,120ZM75.51,99.51a12,12,0,1,1,0,17A12,12,0,0,1,75.51,99.51Zm25,73a12,12,0,1,1,0-17A12,12,0,0,1,100.49,172.49Zm23-40a12,12,0,1,1,17,0A12,12,0,0,1,123.51,132.49Zm41,48a12,12,0,1,1,0-17A12,12,0,0,1,164.49,180.49Z" />
  </Svg>
);

const FileTextIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 256 256" fill={color}>
    <Path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34Zm-104,88a8,8,0,0,1-11.32,11.32l-24-24a8,8,0,0,1,0-11.32l24-24a8,8,0,0,1,11.32,11.32L91.31,152Zm72-12.68-24,24a8,8,0,0,1-11.32-11.32L164.69,152l-18.35-18.34a8,8,0,0,1,11.32-11.32l24,24A8,8,0,0,1,181.66,157.66ZM152,88V44l44,44Z" />
  </Svg>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  labelColor?: string;
  isLast?: boolean;
  borderColor?: string;
  valueColor?: string;
  s: (size: number) => number;
}

const SettingsRow = memo(({
  icon,
  label,
  description,
  value,
  onPress,
  labelColor,
  isLast = false,
  borderColor,
  valueColor,
  s,
}: SettingsRowProps) => (
  <View>
    <Pressable
      onPress={() => { if (haptics.settingsRow.enabled) triggerHaptic(haptics.settingsRow.type); onPress?.(); }}
      disabled={!onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
    >
      <View style={{ paddingHorizontal: s(buttonPadding.standard + 4) }} className="flex-row items-center">
        <View style={{ backgroundColor: themeColors.cardLight, width: s(46), height: s(46), borderRadius: s(23), marginRight: s(16) }} className="items-center justify-center">{icon}</View>
        <View className="flex-1">
          <View style={{ paddingVertical: s(buttonPadding.standard + 4) }} className="flex-row items-center">
            <View className="flex-1">
              <Text style={{ color: labelColor }} className={`${textSize.small} ${fontFamily.regular}`}>{label}</Text>
              {description && (
                <Text style={{ color: themeColors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>{description}</Text>
              )}
            </View>
            {value && (
              <Text style={{ color: valueColor }} className={`${textSize.small} ${fontFamily.regular} ml-2`}>{value}</Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
    {!isLast && (
      <View style={{ height: 1, backgroundColor: borderColor }} />
    )}
  </View>
));

function SettingsScreen() {
  const { userEmail: email, handleLogout: onLogout, handleResetAccount: onResetAccount, handleDeleteAccount: onDeleteAccount, sharedIsLocked, sharedLockStatus, tapoutStatus, refreshLockStatus, refreshTapoutStatus } = useAuth();
  const { s } = useResponsive();

  // Check if AuthContext already has data (e.g. HomeScreen pre-populated it)
  const cachedMembership = getCachedMembershipStatus(email);
  const hasCache = sharedLockStatus.isLocked !== undefined && tapoutStatus !== null;

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);
  const [lockChecked, setLockChecked] = useState(hasCache);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(!hasCache);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [, , membership] = await Promise.all([
      refreshLockStatus(true),
      refreshTapoutStatus(true),
      getMembershipStatus(email, false),
    ]);
    setMembershipStatus(membership);
    setRefreshing(false);
  }, [email, refreshLockStatus, refreshTapoutStatus]);

  // Heartbeat animation for tapout icon
  const heartBeat = useRef(new Animated.Value(1)).current;
  const tapoutIconSize = iconSize.toggleRow;

  const tapoutsRemaining = tapoutStatus?.remaining ?? 0;

  useEffect(() => {
    if (tapoutsRemaining === 0) {
      heartBeat.setValue(1);
      return;
    }
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeat, { toValue: 1.15, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartBeat, { toValue: 1, duration: 80, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(60),
        Animated.timing(heartBeat, { toValue: 1.1, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartBeat, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [heartBeat, tapoutsRemaining]);


  // Membership state - initialize from cache if available
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(cachedMembership);

  // Load data on mount - use AuthContext refreshes or skip if already populated
  useEffect(() => {
    if (hasCache) {
      setLockChecked(true);
      setLoading(false);
      return;
    }

    async function init() {
      const [, , membership] = await Promise.all([
        refreshLockStatus(false),
        refreshTapoutStatus(false),
        getMembershipStatus(email, false),
      ]);

      setMembershipStatus(membership);
      setLockChecked(true);
      setLoading(false);
    }
    init();
  }, [email, hasCache]);

  // Force re-render every 60s so countdown strings (tapout refill, trial remaining) stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Note: Scheduled preset navigation is handled centrally by App.tsx
  // which polls every 5 seconds and navigates to home when a preset becomes active.
  // The onNavigateToHome prop is kept for future use but no longer used here
  // to avoid duplicate navigation logic and race conditions.

  // Format time until next refill (+1 tapout every 2 weeks)
  const getTimeUntilRefill = () => {
    // Don't show if already at max (3)
    if ((tapoutStatus?.remaining ?? 3) >= 3) return null;
    if (!tapoutStatus?.nextRefillDate) return null;

    const now = new Date();
    const refill = new Date(tapoutStatus.nextRefillDate);
    const diffMs = refill.getTime() - now.getTime();
    if (diffMs <= 0) return '+1 soon';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `+1 in ${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `+1 in ${hours}h ${minutes}m`;
    } else {
      return `+1 in ${minutes}m`;
    }
  };

  // Format time until trial ends
  const getTrialTimeRemaining = () => {
    // Don't show if already a member or no trial end date
    if (membershipStatus?.isMember) return null;
    if (!membershipStatus?.trialEnd) return null;

    const now = new Date();
    const trialEnd = new Date(membershipStatus.trialEnd);
    const diffMs = trialEnd.getTime() - now.getTime();

    // Trial expired
    if (diffMs <= 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Note: Trial expiry is now handled at the App level with MembershipScreen
  // The modal here is for users to view/change their membership during trial or as members

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request');
  };

  const handleBugReport = () => {
    Linking.openURL('mailto:bugs@scuteapp.com?subject=Scute%20Bug%20Report');
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    setIsLoggingOut(true);
    // Small delay to show the overlay before logout completes
    setTimeout(() => {
      onLogout();
    }, 100);
  };

  const handleResetAccount = async () => {
    setResetModalVisible(false);
    setIsResetting(true);
    setResetError(null);

    const result = await onResetAccount();

    setIsResetting(false);
    if (!result.success) {
      setResetError(result.error || 'Failed to reset account');
    }
  };

  const handleDeleteAccountConfirm = () => {
    // First step confirmed, show final confirmation
    setDeleteStep(2);
  };

  const handleDeleteAccount = async () => {
    // Final confirmation, proceed with deletion
    setDeleteModalVisible(false);
    setDeleteStep(1);
    setIsDeleting(true);
    setDeleteError(null);

    const result = await onDeleteAccount();

    setIsDeleting(false);
    if (!result.success) {
      setDeleteError(result.error || 'Failed to delete account');
    }
    // If successful, App.tsx will navigate away so we don't need to do anything
  };

  // Don't allow any actions until lock status is checked, or if locked
  const isDisabled = !lockChecked || sharedIsLocked === true;

  // Memoize icon JSX so SettingsRow memo isn't defeated by new element references
  const mailIcon = useMemo(() => <MailIcon color={colors.text} />, [colors.text]);
  const membershipIcon = useMemo(() => <MembershipIcon color={colors.text} />, [colors.text]);
  const logoutIcon = useMemo(() => <LogoutIcon color={colors.text} />, [colors.text]);
  const messageIcon = useMemo(() => <MessageIcon color={colors.text} />, [colors.text]);
  const bugIcon = useMemo(() => <BugIcon color={colors.text} />, [colors.text]);
  const shieldIcon = useMemo(() => <ShieldIcon color={colors.text} />, [colors.text]);
  const fileTextIcon = useMemo(() => <FileTextIcon color={colors.text} />, [colors.text]);
  const refreshIcon = useMemo(() => <RefreshIcon color={colors.text} />, [colors.text]);
  const trashIcon = useMemo(() => <TrashIcon color={colors.yellow} />, [colors.yellow]);

  // Show full-screen loading only for destructive actions (reset/delete/logout)
  // Initial load uses cache so it's instant - no spinner needed
  if (isResetting || isDeleting || isLoggingOut) {
    return <HourglassLoader />;
  }

  // Show loading spinner only if cache miss (rare - HomeScreen pre-populates)
  if (loading) {
    return <HourglassLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Settings</Text>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: s(16), paddingTop: s(8), paddingBottom: s(32) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.text]} progressBackgroundColor={colors.card} />}
      >
        {/* ACCOUNT Section */}
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2`}>
          Account
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']} mb-4`}>
          <SettingsRow
            icon={mailIcon}
            label={email}
            description="Signed in"
            labelColor={colors.text}
            borderColor={colors.divider}
            s={s}
          />
          {/* Membership Row with Trial Countdown */}
          <View>
            <Pressable
              onPress={() => { if (haptics.settingsRow.enabled) triggerHaptic(haptics.settingsRow.type); setMembershipModalVisible(true); }}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
            >
              <View style={{ paddingHorizontal: s(buttonPadding.standard + 4) }} className="flex-row items-center">
                <View style={{ backgroundColor: colors.cardLight, width: s(46), height: s(46), borderRadius: s(23), marginRight: s(16) }} className="items-center justify-center"><MembershipIcon color={colors.text} /></View>
                <View className="flex-1">
                  <View style={{ paddingVertical: s(buttonPadding.standard + 4) }}>
                    <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>Membership</Text>
                    {membershipStatus?.isMember ? (
                      <Text style={{ color: colors.green }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                        Active Member
                      </Text>
                    ) : getTrialTimeRemaining() ? (
                      <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                        Trial ends in {getTrialTimeRemaining()}
                      </Text>
                    ) : (
                      <Text style={{ color: colors.red }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                        Trial expired
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
          </View>
          <View style={{ opacity: isDisabled ? 0.6 : 1 }}>
            <SettingsRow
              icon={logoutIcon}
              label="Log Out"
              description="Sign out of your account"
              onPress={isDisabled ? undefined : () => setLogoutModalVisible(true)}
              labelColor={colors.text}
              borderColor={colors.divider}
              isLast
              s={s}
            />
          </View>
        </View>

        {/* EMERGENCY TAPOUT Section */}
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2`}>
          Emergency Tapout
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']} mb-4`}>
          {/* Header Row */}
          <View
            style={{ paddingVertical: s(18), paddingHorizontal: s(20) }}
            className="flex-row items-center"
          >
            <View style={{ backgroundColor: themeColors.cardLight, width: s(46), height: s(46), borderRadius: s(23), marginRight: s(16) }} className="items-center justify-center">
              {tapoutsRemaining === 0 ? (
                <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 640 640" fill={colors.textMuted}>
                  <Path d="M197.1 96C214.4 96 231.3 99.4 247 105.7L301.8 190.9L226.4 266.3C224.9 267.8 224 269.9 224.1 272.1C224.2 274.3 225.1 276.3 226.7 277.8L338.7 381.8C341.6 384.5 346.1 384.7 349.2 382.1C352.3 379.5 353 375.1 350.9 371.7L290.5 273.6L381.2 198C383.8 195.9 384.7 192.3 383.6 189.2L360.4 124.6C383.6 106.3 412.6 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96z" />
                </Svg>
              ) : (
                <Animated.View style={{ transform: [{ scale: heartBeat }], opacity: heartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 640 640" fill={colors.red}>
                    <Path d="M273 151.1L288 171.8L303 151.1C328 116.5 368.2 96 410.9 96C484.4 96 544 155.6 544 229.1L544 231.7C544 249.3 540.6 267.3 534.5 285.4C512.7 276.8 488.9 272 464 272C358 272 272 358 272 464C272 492.5 278.2 519.6 289.4 544C288.9 544 288.5 544 288 544C272.5 544 257.2 539.4 244.9 529.9C171.9 474.2 32 343.9 32 231.7L32 229.1C32 155.6 91.6 96 165.1 96C207.8 96 248 116.5 273 151.1zM320 464C320 384.5 384.5 320 464 320C543.5 320 608 384.5 608 464C608 543.5 543.5 608 464 608C384.5 608 320 543.5 320 464zM497.4 387C491.6 382.8 483.6 383 478 387.5L398 451.5C392.7 455.7 390.6 462.9 392.9 469.3C395.2 475.7 401.2 480 408 480L440.9 480L425 522.4C422.5 529.1 424.8 536.7 430.6 541C436.4 545.3 444.4 545 450 540.5L530 476.5C535.3 472.3 537.4 465.1 535.1 458.7C532.8 452.3 526.8 448 520 448L487.1 448L503 405.6C505.5 398.9 503.2 391.3 497.4 387z" />
                  </Svg>
                </Animated.View>
              )}
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>Tapouts Remaining</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                Unlock your phone in emergencies
              </Text>
            </View>
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>
              {tapoutStatus?.remaining ?? 0}/3
            </Text>
          </View>

          {/* Refill Timer Row - shows when below 3 tapouts */}
          {tapoutStatus && getTimeUntilRefill() && (
            <>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <View style={{ paddingVertical: s(18), paddingHorizontal: s(20) }} className="flex-row items-center justify-between">
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>Next Refill</Text>
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {getTimeUntilRefill()}
              </Text>
            </View>
            </>
          )}
        </View>

        {/* SUPPORT Section */}
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2`}>
          Support
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']}`}>
          <SettingsRow
            icon={messageIcon}
            label="Contact Support"
            description="Get help from our team"
            onPress={handleContactSupport}
            labelColor={colors.text}
            borderColor={colors.divider}
            s={s}
          />
          <SettingsRow
            icon={bugIcon}
            label="Bug Report"
            description="Report an issue"
            onPress={handleBugReport}
            labelColor={colors.text}
            borderColor={colors.divider}
            s={s}
          />
          <SettingsRow
            icon={shieldIcon}
            label="Privacy Policy"
            description="How we handle your data"
            onPress={() => setPrivacyModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}
            s={s}
          />
          <SettingsRow
            icon={fileTextIcon}
            label="Terms of Service"
            description="Usage terms and conditions"
            onPress={() => setTermsModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}
            isLast
            s={s}
          />
        </View>

        {/* DATA Section */}
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2 mt-4`}>
          Data
        </Text>
        {resetError && (
          <View style={{ backgroundColor: `${colors.red}33` }} className={`${radius.xl} px-4 py-3 mb-3`}>
            <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular}`}>{resetError}</Text>
          </View>
        )}
        {deleteError && (
          <View style={{ backgroundColor: `${colors.red}33` }} className={`${radius.xl} px-4 py-3 mb-3`}>
            <Text style={{ color: colors.red }} className={`${textSize.small} ${fontFamily.regular}`}>{deleteError}</Text>
          </View>
        )}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']}`}>
          <View style={{ opacity: isDisabled ? 0.6 : 1 }}>
            <SettingsRow
              icon={refreshIcon}
              label="Reset Account"
              description="Clear all presets and data"
              onPress={isDisabled ? undefined : () => setResetModalVisible(true)}
              labelColor={colors.text}
              borderColor={colors.divider}
              s={s}
            />
            <SettingsRow
              icon={trashIcon}
              label="Delete Account"
              description="Permanently remove your account"
              onPress={isDisabled ? undefined : () => { setDeleteStep(1); setDeleteModalVisible(true); }}
              labelColor={colors.yellow}
              borderColor={colors.divider}
              isLast
              s={s}
            />
          </View>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="Log Out"
        message="Are you sure you want to log out? You can sign back in anytime."
        confirmText="Log Out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* Reset Account Modal */}
      <ConfirmationModal
        visible={resetModalVisible}
        title="Reset Account Data"
        message="This will delete all your presets, overlays, and settings. Your account and membership status will be preserved."
        confirmText="Reset"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleResetAccount}
        onCancel={() => setResetModalVisible(false)}
      />

      {/* Delete Account Modal - Two Steps */}
      <ConfirmationModal
        key={deleteStep}
        visible={deleteModalVisible}
        title={deleteStep === 1 ? 'Delete Account' : 'Are You Sure?'}
        message={deleteStep === 1
          ? 'This will permanently delete your account and all associated data. Previous purchases will not be refunded. This action cannot be undone.'
          : 'This action is permanent and cannot be undone. All your data will be deleted forever.'}
        confirmText={deleteStep === 1 ? 'Continue' : 'Delete Account'}
        cancelText="Cancel"
        isDestructive
        onConfirm={deleteStep === 1 ? handleDeleteAccountConfirm : handleDeleteAccount}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <SlideUpModal
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
          <View style={{ width: s(40) }} />
          <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Privacy Policy</Text>
          <HeaderIconButton onPress={() => setPrivacyModalVisible(false)} style={{ width: s(40) }} className="px-2 items-end">
            <CheckCircleIcon size={s(iconSize.headerNav)} color="#FFFFFF" weight="fill" />
          </HeaderIconButton>
        </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-4`}>Privacy Policy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Thank you for using Scute. Your privacy is important to us, and this Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>1. Information We Collect</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-2`}>
              We collect the following types of information:
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              • Email Address: Collected during account registration or Google Sign-In to identify your account.{'\n'}
              • Preset Configurations: Your blocking presets, including selected apps, blocked websites, timer settings, overlay customization, and schedule data are stored on our servers to sync across sessions. This data is not tampered with and is stored solely to provide and maintain your user experience.{'\n'}
              • Custom Overlay Images: If you upload a custom image for your blocking overlay, the image is stored on our servers.{'\n'}
              • App Usage Data: We access app usage statistics on your device to track screen time and enforce app-blocking features. This data is processed locally on your device and is not transmitted to our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>2. How We Use Your Information</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We use your information for the following purposes:{'\n'}
              • To create and manage your account.{'\n'}
              • To enable core app functionality, such as app blocking and screen time tracking.{'\n'}
              • To store and sync your preset configurations and overlay customizations across sessions.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>3. Data Storage and Security</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              • Your email address and preset configurations are stored securely in our cloud database.{'\n'}
              • App usage data is stored locally on your device and is not uploaded to our servers.{'\n'}
              • Custom overlay images are stored on our servers and associated with your account.{'\n'}
              • We use industry-standard encryption to protect data in transit and at rest.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>4. Third-Party Services</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We use the following third-party services:{'\n'}
              • Google Sign-In: For optional account authentication using your Google account. We receive your email address and display name from Google.{'\n'}
              • Google Play: For processing subscription and one-time payments. We do not store your payment information (credit card details, billing address, etc.). All payment processing is handled securely by Google Play. We only receive confirmation of your subscription status.{'\n'}
              • SendGrid: For sending transactional emails, including account verification, sign-in codes, and Alert Notification emails when the feature is enabled.{'\n'}
              • Twilio: For sending SMS text messages when the Alert Notifications feature is enabled and a phone number is provided. Standard message and data rates may apply.{'\n'}
              These services have their own privacy policies, and we encourage you to review them.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>5. Permissions</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              To provide our services, the app requires the following permissions:{'\n'}
              • Usage Access: To monitor and block apps on your device.{'\n'}
              • Display Over Other Apps: To show blocking overlays.{'\n'}
              • Accessibility Services: To enforce app-blocking functionality.{'\n'}
              • Notification Access: To block notifications from restricted apps.{'\n'}
              • VPN Service: To block restricted websites. This VPN operates locally on your device and does not route your internet traffic through external servers.{'\n'}
              • Device Administrator: To prevent unauthorized uninstallation of the app during active blocking sessions.{'\n'}
              • Exact Alarms: To schedule blocking sessions at precise times.{'\n'}
              • Boot Receiver: To restore active sessions after device restarts.{'\n'}
              • Foreground Service: To maintain blocking functionality while the app runs in the background.{'\n'}
              These permissions are used solely for the app's intended functionality.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>6. Data Sharing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We do not sell, rent, or share your personal information with third parties, except:{'\n'}
              • When required by law.{'\n'}
              • To protect the rights, safety, or property of Scute or its users.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>7. Communications</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              By providing your email address and creating an account, you consent to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Please note that even if you opt out of marketing emails, we may still send you transactional or account-related communications (such as account verification, security alerts, and service updates).{'\n\n'}
              Alert Notifications: If you enable the Alert Notifications feature on a preset and provide an email address or phone number, you expressly consent to receive automated alert emails and/or SMS text messages sent to those addresses each time a blocked app or website is opened during that preset. You may withdraw consent at any time by disabling the Alert Notifications toggle in your preset settings. Message and data rates may apply for SMS alerts. We do not share your alert email or phone number with any third party except SendGrid (email delivery) and Twilio (SMS delivery) solely for the purpose of sending these alerts.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>8. Your Rights</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              You have the right to:{'\n'}
              • Access, update, or delete your account information.{'\n'}
              • Revoke app permissions at any time through your device settings.{'\n'}
              To exercise these rights, contact us at info@scuteapp.com.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>9. Children's Privacy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Scute is not intended for children under the age of 13. We do not knowingly collect personal information from children.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>10. Data Retention</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We retain your email address for as long as your account is active. App usage data is stored locally on your device and is deleted when you uninstall the App. Upon account deletion, all associated data is permanently removed from our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>11. Changes to This Policy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We may update this Privacy Policy from time to time. Any changes will be posted in the app, and the "Effective Date" will be updated accordingly.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>12. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              If you have any questions or concerns about this Privacy Policy, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>

            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-8`}>
              © 2026 Scute LLC
            </Text>
        </ScrollView>
      </SlideUpModal>

      {/* Terms of Service Modal */}
      <SlideUpModal
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
          <View style={{ width: s(40) }} />
          <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Terms of Service</Text>
          <HeaderIconButton onPress={() => setTermsModalVisible(false)} style={{ width: s(40) }} className="px-2 items-end">
            <CheckCircleIcon size={s(iconSize.headerNav)} color="#FFFFFF" weight="fill" />
          </HeaderIconButton>
        </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-4`}>Terms of Service</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Welcome to Scute. By downloading, installing, or using the Scute mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>1. Acceptance of Terms</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              By accessing or using Scute, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>2. Description of Service</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Scute is a digital wellness application designed to help users manage screen time by blocking access to selected applications, websites, and the Settings app on their device. The App uses accessibility services, usage access permissions, and notification access to enforce blocking functionality, including blocking notifications from restricted apps.{'\n\n'}
              Website blocking is achieved through a local VPN service that operates entirely on your device. No internet traffic is routed through external servers.{'\n\n'}
              The App supports scheduled sessions that can activate automatically at preset times without requiring user interaction at the time of activation. Blocking sessions persist across device restarts — if your device reboots during an active session, blocking will automatically resume when the device starts up.{'\n\n'}
              The App may use Device Administrator privileges to prevent its own uninstallation during active blocking sessions, ensuring the integrity of the blocking functionality.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>3. User Responsibilities</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              You are solely responsible for:{'\n'}
              • Configuring the App according to your preferences and needs.{'\n'}
              • Understanding that enabling blocking features will restrict access to selected apps and device settings.{'\n'}
              • Ensuring you have alternative means to access essential functions (such as emergency calls) during blocking sessions.{'\n'}
              • Any consequences resulting from your use of the App's blocking features.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>4. Assumption of Risk</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              You acknowledge and agree that:{'\n'}
              • The App is designed to intentionally restrict access to your device's applications and settings.{'\n'}
              • Blocking sessions cannot be easily bypassed once activated, which is a core feature of the App.{'\n'}
              • Enabling Strict Mode will prevent you from ending a blocking session unless you use the Emergency Tapout feature.{'\n'}
              • The App may prevent its own uninstallation during active blocking sessions using Device Administrator privileges.{'\n'}
              • You use the App at your own risk and discretion.{'\n'}
              • You are responsible for ensuring blocking sessions do not interfere with essential device functions you may need.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>5. Disclaimer of Warranties</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>6. Limitation of Liability</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              If you experience any issues such as prolonged blocking due to bugs, unexpected behavior, or accidental activation, please contact our support team at support@scuteapp.com for assistance. We are committed to helping resolve any problems you may encounter.{'\n\n'}
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCUTE AND ITS DEVELOPERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n'}
              • Temporary inability to access blocked applications during a blocking session.{'\n'}
              • Missed notifications, messages, or communications during blocking sessions.{'\n'}
              • Any inconvenience or frustration caused by blocking features working as intended.{'\n'}
              • Any other damages arising from your use of the App.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>7. Indemnification</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              You agree to indemnify, defend, and hold harmless Scute and its developers, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with your use of the App or violation of these Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>8. Emergency Tapout Feature</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              The App provides an optional "Emergency Tapout" feature that allows users to end blocking sessions early. This feature is limited and subject to usage restrictions. We do not guarantee that the Emergency Tapout feature will always be available or functional. Users who disable this feature accept full responsibility for completing their blocking sessions.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>9. Account Termination</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms. You may delete your account at any time through the App's settings if unblocked. Upon account deletion, your email address and all associated account data will be permanently removed from our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>10. Subscriptions and Payments</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              Scute offers subscription plans and a lifetime purchase option:{'\n'}
              • Free Trial: New users receive a 7-day free trial with full access to all features.{'\n'}
              • Monthly Subscription: $6.95/month, billed monthly.{'\n'}
              • Yearly Subscription: $4.95/month ($59.40/year), billed annually.{'\n'}
              • Lifetime Purchase: $49.95 one-time payment for permanent access.{'\n\n'}
              Subscriptions are processed through Google Play. By subscribing, you agree to Google Play's terms of service. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage or cancel your subscription through Google Play Store settings. Refunds are handled according to Google Play's refund policy.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>11. Communications & Alert Notifications</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              By creating an account and providing your email address, you agree to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Opting out of marketing emails will not affect transactional or account-related communications (such as account verification, security alerts, and service updates).{'\n\n'}
              Alert Notifications: By enabling the Alert Notifications feature on a preset and providing an email address and/or phone number, you expressly consent to receive automated alert messages each time a blocked app or website is opened during that preset. You may revoke this consent at any time by disabling the Alert Notifications toggle in your preset settings. Standard message and data rates may apply for SMS.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>12. Modifications to Terms</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Your continued use of the App after any modifications constitutes acceptance of the updated Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>13. Governing Law</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scute operates, without regard to conflict of law principles.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>14. Severability</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>15. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              If you have any questions about these Terms of Service, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>

            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-8`}>
              © 2026 Scute LLC
            </Text>
        </ScrollView>
      </SlideUpModal>

      {/* Membership Modal */}
      <SlideUpModal
        visible={membershipModalVisible}
        preventClose={!!membershipStatus?.trialExpired}
        onRequestClose={() => setMembershipModalVisible(false)}
      >
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
          {/* Only show back button if trial hasn't expired */}
          {!membershipStatus?.trialExpired ? (
            <HeaderIconButton onPress={() => setMembershipModalVisible(false)} style={{ width: s(40) }}>
              <ReplyArrowIcon size={s(iconSize.headerNav)} color="#FFFFFF" direction="left" />
            </HeaderIconButton>
          ) : (
            <View style={{ width: s(40) }} />
          )}
          <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Membership</Text>
          <View style={{ width: s(40) }} />
        </View>

        <MembershipContent />
      </SlideUpModal>
    </View>
  );
}

export default memo(SettingsScreen);
