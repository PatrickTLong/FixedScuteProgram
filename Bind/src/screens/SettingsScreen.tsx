import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
const Lottie = LottieView as any;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ConfirmationModal from '../components/ConfirmationModal';
import HeaderIconButton from '../components/HeaderIconButton';
import EmailConfirmationModal from '../components/EmailConfirmationModal';
import { getLockStatus, getEmergencyTapoutStatus, getCachedLockStatus, getCachedTapoutStatus, getMembershipStatus, MembershipStatus, getCachedMembershipStatus } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

// Icons - white with thicker strokes
const PlayStoreIcon = ({ size = iconSize.lg }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 466 511.98">
    <Path fill="#EA4335" fillRule="nonzero" d="M199.9 237.8l-198.5 232.37c7.22,24.57 30.16,41.81 55.8,41.81 11.16,0 20.93,-2.79 29.3,-8.37l0 0 244.16 -139.46 -130.76 -126.35z"/>
    <Path fill="#FBBC04" fillRule="nonzero" d="M433.91 205.1l0 0 -104.65 -60 -111.61 110.22 113.01 108.83 104.64 -58.6c18.14,-9.77 30.7,-29.3 30.7,-50.23 -1.4,-20.93 -13.95,-40.46 -32.09,-50.22z"/>
    <Path fill="#34A853" fillRule="nonzero" d="M199.42 273.45l129.85 -128.35 -241.37 -136.73c-8.37,-5.58 -19.54,-8.37 -30.7,-8.37 -26.5,0 -50.22,18.14 -55.8,41.86 0,0 0,0 0,0l198.02 231.59z"/>
    <Path fill="#4285F4" fillRule="nonzero" d="M1.39 41.86c-1.39,4.18 -1.39,9.77 -1.39,15.34l0 397.64c0,5.57 0,9.76 1.4,15.34l216.27 -214.86 -216.28 -213.46z"/>
  </Svg>
);

const MailIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6l-10 7L2 6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MembershipIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 11a4 4 0 100-8 4 4 0 000 8z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M23 21v-2a4 4 0 00-3-3.87"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 3.13a4 4 0 010 7.75"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LogoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RefreshIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6M1 20v-6h6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MessageIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BugIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShieldIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FileTextIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron right icon - matches PresetEditModal
const ChevronRightIcon = ({ size = iconSize.lg, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TapoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  labelColor?: string;
  isLast?: boolean;
  borderColor?: string;
  valueColor?: string;
  s: (size: number) => number;
}

const SettingsRow = memo(({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  labelColor,
  isLast = false,
  borderColor,
  valueColor,
  s,
}: SettingsRowProps) => (
  <TouchableOpacity
    onPressIn={() => { if (onPress) lightTap(); }}
    onPress={onPress || undefined}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
    style={!isLast ? { borderBottomWidth: 1, borderBottomColor: borderColor, paddingVertical: s(buttonPadding.standard) } : { paddingVertical: s(buttonPadding.standard) }}
    className="flex-row items-center px-4"
  >
    <View className="mr-4">{icon}</View>
    <Text style={{ color: labelColor }} className={`flex-1 ${textSize.small} ${fontFamily.regular}`}>{label}</Text>
    {value && (
      <Text style={{ color: valueColor }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>{value}</Text>
    )}
    {showArrow && onPress && (
      <ChevronRightIcon size={s(iconSize.sm)} />
    )}
  </TouchableOpacity>
));

function SettingsScreen() {
  const { userEmail: email, handleLogout: onLogout, handleResetAccount: onResetAccount, handleDeleteAccount: onDeleteAccount, sharedIsLocked, setSharedIsLocked, tapoutStatus, setTapoutStatus } = useAuth();
  const { s } = useResponsive();

  // Check cache synchronously for initial render - avoids flash if cache exists
  const cachedLockStatus = getCachedLockStatus(email);
  const cachedTapoutStatus = getCachedTapoutStatus(email);
  const cachedMembership = getCachedMembershipStatus(email);
  const hasCache = cachedLockStatus !== null && cachedTapoutStatus !== null;

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteEmailConfirmModalVisible, setDeleteEmailConfirmModalVisible] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime' | null>(null);
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

  // Membership state - initialize from cache if available
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(cachedMembership);

  // Load data on mount - seed shared state from cache or fetch if cache miss
  useEffect(() => {
    if (hasCache) {
      setSharedIsLocked(cachedLockStatus.isLocked);
      if (cachedTapoutStatus) setTapoutStatus(cachedTapoutStatus);
      return;
    }

    async function init() {
      const [status, tapout, membership] = await Promise.all([
        getLockStatus(email, false),
        getEmergencyTapoutStatus(email, false),
        getMembershipStatus(email, false),
      ]);

      setSharedIsLocked(status.isLocked);
      setTapoutStatus(tapout);
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
    if (sharedIsLocked) return;
    Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request');
  };

  const handleBugReport = () => {
    if (sharedIsLocked) return;
    Linking.openURL('mailto:info@scuteapp.com?subject=Scute%20Bug%20Report');
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
    // First modal confirmed, show email confirmation modal
    setDeleteAccountModalVisible(false);
    setDeleteEmailConfirmModalVisible(true);
  };

  const handleDeleteAccount = async () => {
    // Email confirmed, proceed with deletion
    setDeleteEmailConfirmModalVisible(false);
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
  const mailIcon = useMemo(() => <MailIcon />, []);
  const membershipIcon = useMemo(() => <MembershipIcon />, []);
  const logoutIcon = useMemo(() => <LogoutIcon />, []);
  const messageIcon = useMemo(() => <MessageIcon />, []);
  const bugIcon = useMemo(() => <BugIcon />, []);
  const shieldIcon = useMemo(() => <ShieldIcon />, []);
  const fileTextIcon = useMemo(() => <FileTextIcon />, []);
  const refreshIcon = useMemo(() => <RefreshIcon />, []);
  const trashIcon = useMemo(() => <TrashIcon color={colors.red} />, [colors.red]);

  // Show full-screen loading only for destructive actions (reset/delete/logout)
  // Initial load uses cache so it's instant - no spinner needed
  if (isResetting || isDeleting || isLoggingOut) {
    const loadingMessage = isResetting ? 'Resetting Account...' : isDeleting ? 'Deleting Account...' : 'Logging Out...';

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <Lottie
          source={require('../frontassets/Loading Dots Blue.json')}
          autoPlay
          loop
          speed={2}
          style={{ width: s(250), height: s(250) }}
        />
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.semibold} mt-4`}>{loadingMessage}</Text>
      </View>
    );
  }

  // Show loading spinner only if cache miss (rare - HomeScreen pre-populates)
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
      {/* Locked Overlay */}
      {sharedIsLocked && (
        <View style={{ backgroundColor: colors.bg + 'F2' }} className="absolute inset-0 z-50 items-center justify-center" pointerEvents="auto" onStartShouldSetResponder={() => true}>
          <View className="items-center" style={{ marginTop: '-20%' }}>
            <Image
              source={require('../frontassets/TrueScute-Photoroom.png')}
              style={{ width: s(250), height: s(250), tintColor: colors.logoTint, marginBottom: s(-60) }}
              resizeMode="contain"
            />
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} mb-2`}>Phone is Locked</Text>
            <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.small} ${fontFamily.regular} px-8`}>
              Settings cannot be changed while blocking is active.
            </Text>
          </View>
        </View>
      )}

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
        contentContainerStyle={{ paddingHorizontal: s(16), paddingTop: s(16), paddingBottom: s(32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT Section */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-2`}>
          Account
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6`}>
          <SettingsRow
            icon={mailIcon}
            label={email}
            showArrow={false}
            labelColor={colors.text}
            borderColor={colors.divider}
            s={s}
          />
          {/* Membership Row with Trial Countdown */}
          <TouchableOpacity
            onPressIn={lightTap}
            onPress={() => setMembershipModalVisible(true)}
            activeOpacity={0.7}
            style={{ borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: s(buttonPadding.standard) }}
            className="px-4"
          >
            <View className="flex-row items-center">
              <View className="mr-4"><MembershipIcon /></View>
              <View className="flex-1">
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
              <ChevronRightIcon size={s(iconSize.sm)} />
            </View>
          </TouchableOpacity>
          <SettingsRow
            icon={logoutIcon}
            label="Log Out"
            onPress={isDisabled ? undefined : () => setLogoutModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}

            isLast
            s={s}
          />
        </View>

        {/* EMERGENCY TAPOUT Section */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}  tracking-wider mb-2`}>
          Emergency Tapout
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']} mb-6`}>
          {/* Header Row */}
          <View
            style={getTimeUntilRefill() ? { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: s(buttonPadding.standard) } : { paddingVertical: s(buttonPadding.standard) }}
            className="flex-row items-center px-4"
          >
            <View className="mr-4">
              <TapoutIcon />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.regular}`}>Tapouts Remaining</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-0.5`}>
                Unlock your phone in emergencies
              </Text>
            </View>
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>
              {tapoutStatus?.remaining ?? 0}/3
            </Text>
          </View>

          {/* Refill Timer Row - shows when below 3 tapouts */}
          {tapoutStatus && getTimeUntilRefill() && (
            <View style={{ paddingVertical: s(buttonPadding.standard) }} className="flex-row items-center justify-between px-4">
              <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular}`}>Next Refill</Text>
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                {getTimeUntilRefill()}
              </Text>
            </View>
          )}
        </View>

        {/* SUPPORT Section */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular}  tracking-wider mb-2`}>
          Support
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']}`}>
          <SettingsRow
            icon={messageIcon}
            label="Contact Support"
            onPress={isDisabled ? undefined : handleContactSupport}
            labelColor={colors.text}
            borderColor={colors.divider}

            s={s}
          />
          <SettingsRow
            icon={bugIcon}
            label="Bug Report"
            onPress={isDisabled ? undefined : handleBugReport}
            labelColor={colors.text}
            borderColor={colors.divider}

            s={s}
          />
          <SettingsRow
            icon={shieldIcon}
            label="Privacy Policy"
            onPress={() => setPrivacyModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}

            s={s}
          />
          <SettingsRow
            icon={fileTextIcon}
            label="Terms of Service"
            onPress={() => setTermsModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}

            isLast
            s={s}
          />
        </View>

        {/* DATA Section */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} tracking-wider mb-2 mt-6`}>
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
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }} className={`${radius['2xl']}`}>
          <SettingsRow
            icon={refreshIcon}
            label="Reset Account"
            onPress={isDisabled ? undefined : () => setResetModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.divider}

            s={s}
          />
          <SettingsRow
            icon={trashIcon}
            label="Delete Account"
            onPress={isDisabled ? undefined : () => setDeleteAccountModalVisible(true)}
            labelColor={colors.red}
            borderColor={colors.divider}

            isLast
            s={s}
          />
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
        message="This will delete all your presets and settings. Your account and membership status will be preserved."
        confirmText="Reset"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleResetAccount}
        onCancel={() => setResetModalVisible(false)}
      />

      {/* Delete Account Modal - First Warning */}
      <ConfirmationModal
        visible={deleteAccountModalVisible}
        title="Delete Account"
        message="This will permanently delete your account and all associated data. Your subscription will be cancelled automatically. Previous purchases will not be refunded. This action cannot be undone."
        confirmText="Continue"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setDeleteAccountModalVisible(false)}
      />

      {/* Email Confirmation Modal - Second Layer */}
      <EmailConfirmationModal
        visible={deleteEmailConfirmModalVisible}
        userEmail={email}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteEmailConfirmModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
            <View style={{ width: s(40) }} />
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Privacy Policy</Text>
            <HeaderIconButton onPress={() => setPrivacyModalVisible(false)} style={{ width: s(40) }} className="px-2 items-end">
              <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </HeaderIconButton>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-4`}>Privacy Policy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Thank you for using Scute. Your privacy is important to us, and this Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>1. Information We Collect</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-2`}>
              We collect the following types of information:
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              • Email Address: Collected during account registration to identify your account.{'\n'}
              • App Usage Data: We access app usage statistics on your device to track screen time and enforce app-blocking features. This data is processed locally on your device and is not transmitted to our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>2. How We Use Your Information</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We use your information for the following purposes:{'\n'}
              • To create and manage your account.{'\n'}
              • To enable core app functionality, such as app blocking and screen time tracking.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>3. Data Storage and Security</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              • Your email address is stored securely in our cloud database (powered by Supabase).{'\n'}
              • App usage data is stored locally on your device and is not uploaded to our servers.{'\n'}
              • We use industry-standard encryption to protect data in transit and at rest.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>4. Third-Party Services</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We use the following third-party services:{'\n'}
              • Supabase: For secure cloud storage and authentication.{'\n'}
              • Google Play: For processing subscription and one-time payments. We do not store your payment information (credit card details, billing address, etc.). All payment processing is handled securely by Google Play. We only receive confirmation of your subscription status.{'\n'}
              These services have their own privacy policies, and we encourage you to review them.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>5. Permissions</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              To provide our services, the app requires the following permissions:{'\n'}
              • Usage Access: To monitor and block apps on your device.{'\n'}
              • Display Over Other Apps: To show blocking overlays.{'\n'}
              • Accessibility Services: To enforce app-blocking functionality.{'\n'}
              • Notification Access: To block notifications from restricted apps.{'\n'}
              • Exact Alarms: To schedule blocking sessions at precise times.{'\n'}
              • Boot Receiver: To restore active sessions after device restarts.{'\n'}
              • Foreground Service: To maintain blocking functionality while the app runs in the background.{'\n'}
              These permissions are used solely for the app's intended functionality.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>6. Data Sharing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We do not sell, rent, or share your personal information with third parties, except:{'\n'}
              • When required by law.{'\n'}
              • To protect the rights, safety, or property of Scute or its users.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>7. Email Marketing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              By providing your email address and creating an account, you consent to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Please note that even if you opt out of marketing emails, we may still send you transactional or account-related communications (such as account verification, security alerts, and service updates).
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>8. Your Rights</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              You have the right to:{'\n'}
              • Access, update, or delete your account information.{'\n'}
              • Revoke app permissions at any time through your device settings.{'\n'}
              To exercise these rights, contact us at info@scuteapp.com.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>9. Children's Privacy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Scute is not intended for children under the age of 13. We do not knowingly collect personal information from children.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>10. Data Retention</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We retain your email address for as long as your account is active. App usage data is stored locally on your device and is deleted when you uninstall the App. Upon account deletion, all associated data is permanently removed from our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>11. Changes to This Policy</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We may update this Privacy Policy from time to time. Any changes will be posted in the app, and the "Effective Date" will be updated accordingly.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>12. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              If you have any questions or concerns about this Privacy Policy, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>

            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-8`}>
              © 2026 Scute LLC
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
            <View style={{ width: s(40) }} />
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Terms of Service</Text>
            <HeaderIconButton onPress={() => setTermsModalVisible(false)} style={{ width: s(40) }} className="px-2 items-end">
              <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </HeaderIconButton>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-4`}>Terms of Service</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Welcome to Scute. By downloading, installing, or using the Scute mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>1. Acceptance of Terms</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              By accessing or using Scute, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>2. Description of Service</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Scute is a digital wellness application designed to help users manage screen time by blocking access to selected applications, websites, and the Settings app on their device. The App uses accessibility services, usage access permissions, and notification access to enforce blocking functionality, including blocking notifications from restricted apps.{'\n\n'}
              The App supports scheduled sessions that can activate automatically at preset times without requiring user interaction at the time of activation. Blocking sessions persist across device restarts — if your device reboots during an active session, blocking will automatically resume when the device starts up.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>3. User Responsibilities</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              You are solely responsible for:{'\n'}
              • Configuring the App according to your preferences and needs.{'\n'}
              • Understanding that enabling blocking features will restrict access to selected apps and device settings.{'\n'}
              • Ensuring you have alternative means to access essential functions (such as emergency calls) during blocking sessions.{'\n'}
              • Any consequences resulting from your use of the App's blocking features.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>4. Assumption of Risk</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              You acknowledge and agree that:{'\n'}
              • The App is designed to intentionally restrict access to your device's applications and settings.{'\n'}
              • Blocking sessions cannot be easily bypassed once activated, which is a core feature of the App.{'\n'}
              • You use the App at your own risk and discretion.{'\n'}
              • You are responsible for ensuring blocking sessions do not interfere with essential device functions you may need.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>5. Disclaimer of Warranties</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>6. Limitation of Liability</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              If you experience any issues such as prolonged blocking due to bugs, unexpected behavior, or accidental activation, please contact our support team at support@scuteapp.com for assistance. We are committed to helping resolve any problems you may encounter.{'\n\n'}
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCUTE AND ITS DEVELOPERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n'}
              • Temporary inability to access blocked applications during a blocking session.{'\n'}
              • Missed notifications, messages, or communications during blocking sessions.{'\n'}
              • Any inconvenience or frustration caused by blocking features working as intended.{'\n'}
              • Any other damages arising from your use of the App.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>7. Indemnification</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              You agree to indemnify, defend, and hold harmless Scute and its developers, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with your use of the App or violation of these Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>8. Emergency Tapout Feature</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              The App provides an optional "Emergency Tapout" feature that allows users to end blocking sessions early. This feature is limited and subject to usage restrictions. We do not guarantee that the Emergency Tapout feature will always be available or functional. Users who disable this feature accept full responsibility for completing their blocking sessions.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>9. Account Termination</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms. You may delete your account at any time through the App's settings if unblocked. Upon account deletion, your email address and all associated account data will be permanently removed from our servers.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>10. Subscriptions and Payments</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              Scute offers subscription plans and a lifetime purchase option:{'\n'}
              • Free Trial: New users receive a 7-day free trial with full access to all features.{'\n'}
              • Monthly Subscription: $6.95/month, billed monthly.{'\n'}
              • Yearly Subscription: $4.95/month ($59.40/year), billed annually.{'\n'}
              • Lifetime Purchase: $49.95 one-time payment for permanent access.{'\n\n'}
              Subscriptions are processed through Google Play. By subscribing, you agree to Google Play's terms of service. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage or cancel your subscription through Google Play Store settings. Refunds are handled according to Google Play's refund policy.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>11. Email Marketing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              By creating an account and providing your email address, you agree to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Opting out of marketing emails will not affect transactional or account-related communications (such as account verification, security alerts, and service updates).
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>12. Modifications to Terms</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Your continued use of the App after any modifications constitutes acceptance of the updated Terms.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>13. Governing Law</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scute operates, without regard to conflict of law principles.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>14. Severability</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </Text>

            <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.bold} mb-2`}>15. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
              If you have any questions about these Terms of Service, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>

            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-8`}>
              © 2026 Scute LLC
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Membership Modal */}
      <Modal
        visible={membershipModalVisible}
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          // Only allow dismissal if trial hasn't expired
          if (!membershipStatus?.trialExpired) {
            setMembershipModalVisible(false);
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.dividerLight, overflow: 'hidden' }} className="flex-row items-center justify-between px-4 py-3.5">
            {/* Only show back button if trial hasn't expired */}
            {!membershipStatus?.trialExpired ? (
              <HeaderIconButton onPress={() => setMembershipModalVisible(false)} style={{ width: s(40) }}>
                <Svg width={s(iconSize.headerNav)} height={s(iconSize.headerNav)} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 12H5M12 19l-7-7 7-7"
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </HeaderIconButton>
            ) : (
              <View style={{ width: s(40) }} />
            )}
            <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.bold}`}>Membership</Text>
            <View style={{ width: s(40) }} />
          </View>

          <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
            {/* Title Section */}
            <View className="items-center mb-6">
              <View className="flex-row items-center mb-3">
                <PlayStoreIcon size={s(24)} />
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} ml-2`}>Choose Your Plan</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.extraSmall} ${fontFamily.regular}`}>
                All features will remain enabled after membership activation
              </Text>
            </View>

            {/* Monthly Plan */}
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: selectedPlan === 'monthly' ? colors.text : 'transparent',
                padding: s(buttonPadding.standard),
                ...shadow.card,
              }}
              className={`${radius['2xl']} mb-3`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Monthly</Text>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    Billed monthly
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$9.95</Text>
                    <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$6.95</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>/month</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Yearly Plan */}
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: selectedPlan === 'yearly' ? colors.text : 'transparent',
                padding: s(buttonPadding.standard),
                ...shadow.card,
              }}
              className={`${radius['2xl']} mb-3`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Yearly</Text>
                    <View style={{ backgroundColor: colors.border, ...shadow.card }} className={`ml-2 px-2 py-0.5 ${radius.full}`}>
                      <Text className={`${textSize.extraSmall} ${fontFamily.bold} text-white`}>Save 29%</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    $59.40 billed annually
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$6.95</Text>
                    <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$4.95</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>/month</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Lifetime Plan */}
            <TouchableOpacity
              onPressIn={lightTap}
              onPress={() => setSelectedPlan('lifetime')}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: selectedPlan === 'lifetime' ? colors.text : 'transparent',
                padding: s(buttonPadding.standard),
                ...shadow.card,
              }}
              className={`${radius['2xl']} mb-6`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Lifetime</Text>
                    <View style={{ backgroundColor: colors.border, ...shadow.card }} className={`ml-2 px-2 py-0.5 ${radius.full}`}>
                      <Text className={`${textSize.extraSmall} ${fontFamily.bold} text-white`}>Best Value</Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                    One-time payment, forever access
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$79.95</Text>
                    <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$49.95</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>one-time</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Subscribe Button */}
            <TouchableOpacity
              onPressIn={lightTap}
              disabled={!selectedPlan}
              activeOpacity={0.7}
              style={{
                backgroundColor: selectedPlan ? colors.text : colors.border,
                opacity: selectedPlan ? 1 : 0.5,
                ...shadow.card,
              }}
              className={`${radius.full} py-3.5 items-center mb-3`}
            >
              <Text style={{ color: selectedPlan ? '#000000' : colors.textSecondary }} className={`${textSize.small} ${fontFamily.bold}`}>
                {selectedPlan ? 'Continue' : 'Select a Plan'}
              </Text>
            </TouchableOpacity>

            {/* Terms Text */}
            <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-4`}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless cancelled.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default memo(SettingsScreen);
