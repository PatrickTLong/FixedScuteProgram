import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import BoxiconsFilled from '../components/BoxiconsFilled';
import ConfirmationModal from '../components/ConfirmationModal';
import HeaderIconButton from '../components/HeaderIconButton';
import MembershipContent from '../components/MembershipContent';
import { getMembershipStatus, MembershipStatus, getCachedMembershipStatus } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';

// Icons - white with thicker strokes
const MailIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 -960 960 960" fill={color}>
    <Path d="M560-520h280v-200H560v200Zm140-50-100-70v-40l100 70 100-70v40l-100 70ZM80-120q-33 0-56.5-23.5T0-200v-560q0-33 23.5-56.5T80-840h800q33 0 56.5 23.5T960-760v560q0 33-23.5 56.5T880-120H80Zm365-315q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35ZM84-200h552q-42-75-116-117.5T360-360q-86 0-160 42.5T84-200Z" />
  </Svg>
);

const MembershipIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-handshake" size={iconSize.forTabs} color={color} />
);

const LogoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-door-open-alt" size={iconSize.forTabs} color={color} />
);

const RefreshIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 -960 960 960" fill={color}>
    <Path d="M314-115q-104-48-169-145T80-479q0-26 2.5-51t8.5-49l-46 27-40-69 191-110 110 190-70 40-54-94q-11 27-16.5 56t-5.5 60q0 97 53 176.5T354-185l-40 70Zm306-485v-80h109q-46-57-111-88.5T480-800q-55 0-104 17t-90 48l-40-70q50-35 109-55t125-20q79 0 151 29.5T760-765v-55h80v220H620ZM594 0 403-110l110-190 69 40-57 98q118-17 196.5-107T800-480q0-11-.5-20.5T797-520h81q1 10 1.5 19.5t.5 20.5q0 135-80.5 241.5T590-95l44 26-40 69Z" />
  </Svg>
);

const TrashIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 -960 960 960">
    <Path d="m40-120 440-760 440 760H40Z" fill={color} />
    <Path d="M508.5-251.5Q520-263 520-280t-11.5-28.5Q497-320 480-320t-28.5 11.5Q440-297 440-280t11.5 28.5Q463-240 480-240t28.5-11.5ZM440-360h80v-200h-80v200Z" fill="#000000" />
  </Svg>
);

const MessageIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-message-dots" size={iconSize.forTabs} color={color} />
);

const BugIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-report" size={iconSize.forTabs} color={color} />
);

const ShieldIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <BoxiconsFilled name="bx-info-shield" size={iconSize.forTabs} color={color} />
);

const FileTextIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm40-120h400q-4-49-30-90t-68-65l38-68q2-4 1-9t-6-7q-4-2-8.5-1t-6.5 5l-39 70q-20-8-40-12.5t-41-4.5q-21 0-41 4.5T399-365l-39-70q-2-5-6.5-5t-9.5 2l-4 15 38 68q-42 24-68 65t-30 90Zm96-66q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm180 0q-6-6-6-14t6-14q6-6 14-6t14 6q6 6 6 14t-6 14q-6 6-14 6t-14-6Zm-36-334h200L520-800v200Z" />
  </Svg>
);

const ChevronRightIcon = ({ size = iconSize.chevron, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <BoxiconsFilled name="bx-caret-right-circle" size={size} color={color} />
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
    onPressIn={() => { if (onPress && haptics.settingsRow.enabled) triggerHaptic(haptics.settingsRow.type); }}
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
    {showArrow && (
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

  // Heartbeat animation for tapout icon
  const heartBeat = useRef(new Animated.Value(1)).current;
  const tapoutIconSize = iconSize.forTabs;

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
  const trashIcon = useMemo(() => <TrashIcon color={colors.yellow} />, [colors.yellow]);

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold}`}>Settings</Text>
        </View>
        {/* Invisible spacer to match header height with other screens */}
        <View className="w-11 h-11" />
      </View>

      <ScrollView
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
            onPress={() => setMembershipModalVisible(true)}
            onPressIn={() => { if (haptics.settingsRow.enabled) triggerHaptic(haptics.settingsRow.type); }}
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
          <View style={{ opacity: isDisabled ? 0.6 : 1 }}>
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
              {tapoutsRemaining === 0 ? (
                <Svg width={tapoutIconSize} height={tapoutIconSize} viewBox="0 -960 960 960" fill={colors.textMuted}>
                  <Path d="M481-83Q347-218 267.5-301t-121-138q-41.5-55-54-94T80-620q0-92 64-156t156-64q45 0 87 16.5t75 47.5l-62 216h120l-34 335 114-375H480l71-212q25-14 52.5-21t56.5-7q92 0 156 64t64 156q0 48-13 88t-55 95.5q-42 55.5-121 138T481-83Z" />
                </Svg>
              ) : tapoutsRemaining >= 3 ? (
                <Animated.View style={{ transform: [{ scale: heartBeat }], opacity: heartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                  <Svg width={tapoutIconSize} height={tapoutIconSize} viewBox="0 -960 960 960" fill={colors.red}>
                    <Path d="M595-468h-230q0 170 115 170t115-170ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM480-120l-58-50q-101-88-167-152T150-437q-39-51-54.5-94T80-620q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 89T810-437q-39 51-105 115T538-170l-58 50Z" />
                  </Svg>
                </Animated.View>
              ) : (
                <Animated.View style={{ transform: [{ scale: heartBeat }], opacity: heartBeat.interpolate({ inputRange: [1, 1.15], outputRange: [1, 0.85], extrapolate: 'clamp' }) }}>
                  <Svg width={tapoutIconSize} height={tapoutIconSize} viewBox="0 -960 960 960" fill={colors.red}>
                    <Path d="M595-468h-230q0 170 115 170t115-170ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM480-120l-58-50q-101-88-167-152T150-437q-39-51-54.5-94T80-620q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 89T810-437q-39 51-105 115T538-170l-58 50Z" />
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
            onPress={handleContactSupport}
            labelColor={colors.text}
            borderColor={colors.divider}

            s={s}
          />
          <SettingsRow
            icon={bugIcon}
            label="Bug Report"
            onPress={handleBugReport}
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
          <View style={{ opacity: isDisabled ? 0.6 : 1 }}>
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
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
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

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>7. Email Marketing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              By providing your email address and creating an account, you consent to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Please note that even if you opt out of marketing emails, we may still send you transactional or account-related communications (such as account verification, security alerts, and service updates).
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
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
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

            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>11. Email Marketing</Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} leading-5 mb-4`}>
              By creating an account and providing your email address, you agree to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Opting out of marketing emails will not affect transactional or account-related communications (such as account verification, security alerts, and service updates).
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
        </View>
      </Modal>

      {/* Membership Modal */}
      <Modal
        visible={membershipModalVisible}
        animationType="slide"
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

          <MembershipContent />
        </View>
      </Modal>
    </View>
  );
}

export default memo(SettingsScreen);
