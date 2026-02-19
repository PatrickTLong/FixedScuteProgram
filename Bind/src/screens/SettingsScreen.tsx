import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Image,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import BoxiconsFilled from '../components/BoxiconsFilled';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ConfirmationModal from '../components/ConfirmationModal';
import HeaderIconButton from '../components/HeaderIconButton';
import { getMembershipStatus, MembershipStatus, getCachedMembershipStatus } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding, colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

// Icons - white with thicker strokes
const MagicWandIcon = ({ size = iconSize.lg }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill={colors.green} d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Z" />
    <Path fill="#FFFFFF" d="M15.61 10.186a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
  </Svg>
);

const MailIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z"
    />
    <Path
      d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"
    />
  </Svg>
);

const MembershipIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z"
    />
    <Path
      d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z"
    />
  </Svg>
);

const LogoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-door-open-alt" size={iconSize.forTabs} color={color} />
);

const RefreshIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-refresh-cw-alt" size={iconSize.forTabs} color={color} />
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

const MessageIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-message-circle-notification" size={iconSize.forTabs} color={color} />
);

const BugIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.478 1.6a.75.75 0 0 1 .273 1.026 3.72 3.72 0 0 0-.425 1.121c.058.058.118.114.18.168A4.491 4.491 0 0 1 12 2.25c1.413 0 2.673.651 3.497 1.668.06-.054.12-.11.178-.167a3.717 3.717 0 0 0-.426-1.125.75.75 0 1 1 1.298-.752 5.22 5.22 0 0 1 .671 2.046.75.75 0 0 1-.187.582c-.241.27-.505.52-.787.749a4.494 4.494 0 0 1 .216 2.1c-.106.792-.753 1.295-1.417 1.403-.182.03-.364.057-.547.081.152.227.273.476.359.742a23.122 23.122 0 0 0 3.832-.803 23.241 23.241 0 0 0-.345-2.634.75.75 0 0 1 1.474-.28c.21 1.115.348 2.256.404 3.418a.75.75 0 0 1-.516.75c-1.527.499-3.119.854-4.76 1.049-.074.38-.22.735-.423 1.05 2.066.209 4.058.672 5.943 1.358a.75.75 0 0 1 .492.75 24.665 24.665 0 0 1-1.189 6.25.75.75 0 0 1-1.425-.47 23.14 23.14 0 0 0 1.077-5.306c-.5-.169-1.009-.32-1.524-.455.068.234.104.484.104.746 0 3.956-2.521 7.5-6 7.5-3.478 0-6-3.544-6-7.5 0-.262.037-.511.104-.746-.514.135-1.022.286-1.522.455.154 1.838.52 3.616 1.077 5.307a.75.75 0 1 1-1.425.468 24.662 24.662 0 0 1-1.19-6.25.75.75 0 0 1 .493-.749 24.586 24.586 0 0 1 4.964-1.24h.01c.321-.046.644-.085.969-.118a2.983 2.983 0 0 1-.424-1.05 24.614 24.614 0 0 1-4.76-1.05.75.75 0 0 1-.516-.75c.057-1.16.194-2.302.405-3.417a.75.75 0 0 1 1.474.28c-.164.862-.28 1.74-.345 2.634 1.237.371 2.517.642 3.832.803.085-.266.207-.515.359-.742a18.698 18.698 0 0 1-.547-.08c-.664-.11-1.311-.612-1.417-1.404a4.535 4.535 0 0 1 .217-2.103 6.788 6.788 0 0 1-.788-.751.75.75 0 0 1-.187-.583 5.22 5.22 0 0 1 .67-2.04.75.75 0 0 1 1.026-.273Z"
    />
  </Svg>
);

const ShieldIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
    />
  </Svg>
);

const FileTextIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z"
    />
    <Path
      d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z"
    />
  </Svg>
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-right-circle" size={size} color={color} />
);

const TapoutIcon = ({ color = '#FF5C5C' }: { color?: string }) => (
  <MaterialCommunityIcons name="heart-pulse" size={iconSize.forTabs} color={color} />
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
      <ChevronRightIcon size={s(iconSize.chevron)} />
    )}
  </TouchableOpacity>
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
  const [refreshing, setRefreshing] = useState(false);

  // Gear spin animation
  const gearRotation = useRef(new Animated.Value(0)).current;

  // Heartbeat animation for tapout icon
  const heartbeatScale = useRef(new Animated.Value(1)).current;

  const hasTapouts = (tapoutStatus?.remaining ?? 0) > 0;

  useEffect(() => {
    if (!hasTapouts) {
      heartbeatScale.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        // First beat (strong)
        Animated.timing(heartbeatScale, { toValue: 1.25, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartbeatScale, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        // Second beat (softer)
        Animated.timing(heartbeatScale, { toValue: 1.15, duration: 80, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(heartbeatScale, { toValue: 1, duration: 100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        // Pause between heartbeats
        Animated.delay(600),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [heartbeatScale, hasTapouts]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset and play gear spin animation on screen focus
      gearRotation.setValue(0);
      Animated.timing(gearRotation, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    }, [gearRotation])
  );

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
    if (sharedIsLocked) return;
    Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request');
  };

  const handleBugReport = () => {
    if (sharedIsLocked) return;
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

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const [, , membership] = await Promise.all([
      refreshLockStatus(true),
      refreshTapoutStatus(true),
      getMembershipStatus(email, true),
    ]);
    setMembershipStatus(membership);
    setRefreshing(false);
  }, [email, refreshLockStatus, refreshTapoutStatus]);

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
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <LoadingSpinner size={s(48)} />
      </View>
    );
  }

  // Show loading spinner only if cache miss (rare - HomeScreen pre-populates)
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <LoadingSpinner size={s(48)} />
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
          <Animated.View style={{
            marginLeft: s(8),
            transform: [{
              rotate: gearRotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '70deg'],
              }),
            }],
          }}>
            <Svg width={s(iconSize.lg)} height={s(iconSize.lg)} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
                stroke={colors.text}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: s(16), paddingTop: s(16), paddingBottom: s(32) }}
        showsVerticalScrollIndicator={false}
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
              <ChevronRightIcon size={s(iconSize.chevron)} />
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
            <Animated.View className="mr-4" style={{ transform: [{ scale: heartbeatScale }] }}>
              {(tapoutStatus?.remaining ?? 0) > 0
                ? <TapoutIcon />
                : <MaterialCommunityIcons name="heart-broken" size={iconSize.forTabs} color={colors.textMuted} />
              }
            </Animated.View>
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
            onPress={isDisabled ? undefined : () => { setDeleteStep(1); setDeleteModalVisible(true); }}
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

      {/* Delete Account Modal - Two Steps */}
      <ConfirmationModal
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
              <BoxiconsFilled name="bx-check-circle" size={s(iconSize.headerNav)} color="#FFFFFF" />
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
              <BoxiconsFilled name="bx-check-circle" size={s(iconSize.headerNav)} color="#FFFFFF" />
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
                <BoxiconsFilled name="bx-reply-big" size={s(iconSize.headerNav)} color="#FFFFFF" />
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
                <MagicWandIcon size={s(iconSize.xl)} color={colors.text} />
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} ml-2`}>Choose Your Plan</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.extraSmall} ${fontFamily.regular}`}>
                All features will remain enabled after membership activation
              </Text>
            </View>

            {/* Monthly Plan */}
            <TouchableOpacity
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
