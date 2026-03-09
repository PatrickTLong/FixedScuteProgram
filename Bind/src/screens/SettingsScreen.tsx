import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import SlideUpModal from '../components/SlideUpModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { IdentificationCardIcon, FolderOpenIcon, CheckCircleIcon, HeartStraightBreakIcon } from 'phosphor-react-native';
import ReplyArrowIcon from '../components/ReplyArrowIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import HeaderIconButton from '../components/HeaderIconButton';
import MembershipContent from '../components/MembershipContent';
import { getMembershipStatus, MembershipStatus, getCachedMembershipStatus } from '../services/cardApi';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';



// Icons
const MailIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <IdentificationCardIcon size={iconSize.forTabs} color={color} weight="fill" />
);

const MembershipIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M5.49 22a2 2 0 0 1 -1.87 -1.34l-0.55 -1.52a0.27 0.27 0 0 0 -0.14 -0.14 0.26 0.26 0 0 0 -0.21 0 5.72 5.72 0 0 1 -2.22 0.5 0.49 0.49 0 0 0 -0.48 0.37 0.5 0.5 0 0 0 0.22 0.56l2.11 1.26 -0.8 1.59a0.51 0.51 0 0 0 0 0.48A0.52 0.52 0 0 0 2 24c0.48 0 4.16 0 4.88 -2a0.27 0.27 0 0 0 -0.08 -0.28 0.26 0.26 0 0 0 -0.29 0 2 2 0 0 1 -1.02 0.28Z" />
    <Path d="M23.5 19.5a5.72 5.72 0 0 1 -2.22 -0.5 0.26 0.26 0 0 0 -0.21 0 0.27 0.27 0 0 0 -0.14 0.14l-0.55 1.52A2 2 0 0 1 18.61 22a2 2 0 0 1 -1.13 -0.28 0.25 0.25 0 0 0 -0.36 0.3c0.7 2 4.4 2 4.88 2a0.52 0.52 0 0 0 0.43 -0.24 0.51 0.51 0 0 0 0 -0.48l-0.8 -1.59 2.11 -1.26a0.5 0.5 0 0 0 0.22 -0.56 0.49 0.49 0 0 0 -0.46 -0.39Z" />
    <Path d="M18.05 20.22a0.51 0.51 0 0 0 0.45 0.28 0.5 0.5 0 0 0 0.47 -0.33l1.72 -4.73a1.49 1.49 0 0 0 -0.69 -1.82 16.6 16.6 0 0 0 -8 -2.12 16.6 16.6 0 0 0 -8 2.12 1.49 1.49 0 0 0 -0.67 1.82L5 20.17a0.5 0.5 0 0 0 0.44 0.33 0.52 0.52 0 0 0 0.56 -0.27c0 -0.11 1.4 -2.73 6 -2.73s6 2.62 6.05 2.72Z" />
    <Path d="M5.72 11.32a0.86 0.86 0 0 0 0.28 -1l-0.47 -1.24a0.25 0.25 0 0 1 0.07 -0.28l1 -0.81A0.86 0.86 0 0 0 6 6.47H4.88a0.24 0.24 0 0 1 -0.23 -0.17l-0.39 -1.2a0.85 0.85 0 0 0 -1.63 0l-0.39 1.2a0.25 0.25 0 0 1 -0.24 0.17H0.86A0.87 0.87 0 0 0 0.05 7a0.88 0.88 0 0 0 0.26 1l1 0.81a0.24 0.24 0 0 1 0.08 0.28l-0.5 1.25a0.84 0.84 0 0 0 0.28 1 0.86 0.86 0 0 0 1 0l1.11 -0.79a0.23 0.23 0 0 1 0.29 0l1.11 0.79a0.86 0.86 0 0 0 1.04 -0.02Z" />
    <Path d="M9.47 5.25a0.26 0.26 0 0 1 0.08 0.28l-0.64 1.7a0.95 0.95 0 0 0 1.44 1.1l1.5 -1.07a0.26 0.26 0 0 1 0.29 0l1.5 1.07a0.93 0.93 0 0 0 1.12 0 1 1 0 0 0 0.32 -1.09l-0.64 -1.7a0.24 0.24 0 0 1 0.07 -0.28l1.33 -1.11a0.95 0.95 0 0 0 -0.61 -1.67h-1.57a0.25 0.25 0 0 1 -0.24 -0.18L12.89 0.66A0.92 0.92 0 0 0 12 0a0.94 0.94 0 0 0 -0.9 0.66l-0.53 1.63a0.23 0.23 0 0 1 -0.23 0.18H8.75a0.94 0.94 0 0 0 -0.6 1.67Z" />
    <Path d="m19.3 11.34 1.11 -0.79a0.23 0.23 0 0 1 0.29 0l1.11 0.79a0.86 0.86 0 0 0 1 0 0.84 0.84 0 0 0 0.28 -1l-0.47 -1.26a0.25 0.25 0 0 1 0.07 -0.28l1 -0.81a0.86 0.86 0 0 0 -0.55 -1.52H22a0.25 0.25 0 0 1 -0.24 -0.17l-0.39 -1.2a0.85 0.85 0 0 0 -1.63 0l-0.39 1.2a0.24 0.24 0 0 1 -0.23 0.17H18A0.86 0.86 0 0 0 17.42 8l1 0.81a0.25 0.25 0 0 1 0.07 0.28L18 10.34a0.86 0.86 0 0 0 1.3 1Z" />
  </Svg>
);

const LogoutIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.51 18.5a1 1 0 0 0 -1 1v0.5a0.5 0.5 0 0 1 -0.5 0.5h-5.5A0.5 0.5 0 0 1 10 20V4a0.5 0.5 0 0 1 0.5 -0.5H16a0.5 0.5 0 0 1 0.5 0.5v1a1 1 0 0 0 2 0V2.5a1 1 0 0 0 -1 -1H10v-1a0.51 0.51 0 0 0 -0.18 -0.39A0.53 0.53 0 0 0 9.4 0l-9 2a0.5 0.5 0 0 0 -0.4 0.5v19a0.5 0.5 0 0 0 0.4 0.5l9 2a0.51 0.51 0 0 0 0.6 -0.5v-1h7.5a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -0.99 -1Zm-10 -6A1.5 1.5 0 1 1 6 11a1.5 1.5 0 0 1 1.51 1.5Z" />
    <Path d="M22.49 11h-4.12V9.25a1 1 0 0 0 -0.53 -0.88 1 1 0 0 0 -1 0.05l-4.87 3.25a1 1 0 0 0 0 1.66l4.87 3.25a1 1 0 0 0 1.56 -0.83V14h4.12a1.5 1.5 0 0 0 0 -3Z" />
  </Svg>
);

const RefreshIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M6.18 6.17a8.22 8.22 0 0 1 8.35 -2 1.25 1.25 0 1 0 0.76 -2.38A10.75 10.75 0 0 0 2.05 16a0.25 0.25 0 0 1 -0.1 0.3l-1.4 0.93a1 1 0 0 0 -0.43 1 1 1 0 0 0 0.78 0.79l4.41 0.98 0.2 0a1 1 0 0 0 0.55 -0.17 1 1 0 0 0 0.43 -0.63l0.91 -4.41a1 1 0 0 0 -0.42 -1 1 1 0 0 0 -1.11 0l-1.34 0.88a0.29 0.29 0 0 1 -0.22 0 0.28 0.28 0 0 1 -0.16 -0.16 8.28 8.28 0 0 1 2.03 -8.34Z" />
    <Path d="M23.88 5.83a1 1 0 0 0 -0.76 -0.8L18.73 4a1 1 0 0 0 -1.2 0.75l-1 4.38a1 1 0 0 0 0.4 1 1 1 0 0 0 0.58 0.19 0.94 0.94 0 0 0 0.53 -0.16l1.44 -0.9a0.29 0.29 0 0 1 0.22 0 0.28 0.28 0 0 1 0.16 0.16A8.25 8.25 0 0 1 9.57 19.88a1.25 1.25 0 0 0 -1.57 0.83 1.24 1.24 0 0 0 0.82 1.56 10.6 10.6 0 0 0 3.19 0.48A10.75 10.75 0 0 0 22 8a0.27 0.27 0 0 1 0.1 -0.31l1.35 -0.84a1 1 0 0 0 0.43 -1.02Z" />
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
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M23.09 8.4a0.73 0.73 0 0 0 -0.83 0.5 2.78 2.78 0 0 1 -1.18 1.47 1.37 1.37 0 0 1 -1.17 0C18 9.6 18 6.78 18 6.75v-0.69a0.5 0.5 0 0 1 0.32 -0.46 3.73 3.73 0 0 1 2.45 0 1 1 0 1 0 0.58 -1.91 5.52 5.52 0 0 0 -4.64 0.52 9.83 9.83 0 0 0 -3.07 3.37A8.52 8.52 0 0 0 8.19 6C3.53 6 0.28 9.45 0.28 14.38 0.28 16.15 0.7 17 1.51 17H2l-0.3 1.48a0.23 0.23 0 0 1 -0.2 0.15 1 1 0 0 0 0 2 2.17 2.17 0 0 0 2.14 -1.71L4 17.43a0.49 0.49 0 0 1 0.47 -0.43h2a0.49 0.49 0 0 1 0.38 0.17 0.49 0.49 0 0 1 0.12 0.4l-0.13 0.93a0.1 0.1 0 0 1 -0.1 0.08 1 1 0 0 0 0 2 2.12 2.12 0 0 0 2.08 -1.8L9 17.47a0.49 0.49 0 0 1 0.52 -0.47h5.73a0.49 0.49 0 0 1 0.48 0.39l0.33 1.48a2.18 2.18 0 0 0 2.14 1.71 1 1 0 0 0 0 -2 0.23 0.23 0 0 1 -0.19 -0.15l-0.19 -0.83a0.48 0.48 0 0 1 0.1 -0.42 0.49 0.49 0 0 1 0.39 -0.19h0.83c2.86 0 4.57 -1.84 4.57 -3.61V9.14a0.75 0.75 0 0 0 -0.62 -0.74Zm-19 3.81a0.74 0.74 0 0 1 -0.41 -1 4.57 4.57 0 0 1 4 -2.86 0.75 0.75 0 0 1 0 1.5 3.12 3.12 0 0 0 -2.61 1.95 0.75 0.75 0 0 1 -0.98 0.41Zm14.35 1a1 1 0 1 1 -1 1 0.94 0.94 0 0 1 1 -1.02Z" />
  </Svg>
);

const ShieldIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={iconSize.forTabs} height={iconSize.forTabs} viewBox="0 0 24 24" fill={color}>
    <Path d="M2.49 3.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0 -7 0" />
    <Path d="M9.5 13.46a3 3 0 0 1 1.58 -2.67A6.06 6.06 0 0 0 6 8a6 6 0 0 0 -6 5.33 1 1 0 0 0 0.26 0.82 1.05 1.05 0 0 0 0.78 0.35H9.5Z" />
    <Path d="M23.07 12a16.45 16.45 0 0 0 -5.59 -1 16 16 0 0 0 -5.55 1 1.54 1.54 0 0 0 -0.93 1.46v3.39a7.7 7.7 0 0 0 5.19 6.8l0.55 0.21a1.91 1.91 0 0 0 0.74 0.14 1.83 1.83 0 0 0 0.73 -0.14l0.56 -0.21c3.08 -1.17 5.23 -4 5.23 -6.8v-3.39a1.54 1.54 0 0 0 -0.93 -1.46ZM21 15l-2.84 3.79a1.49 1.49 0 0 1 -2.24 0.16l-1.47 -1.47a0.75 0.75 0 1 1 1.06 -1.06L17 17.84l2.82 -3.79A0.75 0.75 0 1 1 21 15Z" />
  </Svg>
);

const FileTextIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <FolderOpenIcon size={iconSize.forTabs} color={color} weight="fill" />
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
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
      <View style={{ paddingVertical: s(buttonPadding.standard + 4), paddingHorizontal: s(buttonPadding.standard + 4) }} className="flex-row items-center">
        <View className="mr-4">{icon}</View>
        <Text style={{ color: labelColor }} className={`flex-1 ${textSize.small} ${fontFamily.regular}`}>{label}</Text>
        {value && (
          <Text style={{ color: valueColor }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>{value}</Text>
        )}
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
  const mailIcon = useMemo(() => <MailIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const membershipIcon = useMemo(() => <MembershipIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const logoutIcon = useMemo(() => <LogoutIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const messageIcon = useMemo(() => <MessageIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const bugIcon = useMemo(() => <BugIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const shieldIcon = useMemo(() => <ShieldIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const fileTextIcon = useMemo(() => <FileTextIcon color={colors.textSecondary} />, [colors.textSecondary]);
  const refreshIcon = useMemo(() => <RefreshIcon color={colors.textSecondary} />, [colors.textSecondary]);
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
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: s(16), paddingTop: s(16), paddingBottom: s(32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT Section */}
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2`}>
          Account
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']} mb-6`}>
          <SettingsRow
            icon={mailIcon}
            label={email}
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
              <View style={{ paddingVertical: s(buttonPadding.standard + 4), paddingHorizontal: s(buttonPadding.standard + 4) }} className="flex-row items-center">
                <View className="mr-4"><MembershipIcon color={colors.textSecondary} /></View>
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
              </View>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
          </View>
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
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2`}>
          Emergency Tapout
        </Text>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }} className={`${radius['2xl']} mb-6`}>
          {/* Header Row */}
          <View
            style={{ paddingVertical: s(buttonPadding.standard + 4), paddingHorizontal: s(buttonPadding.standard + 4) }}
            className="flex-row items-center"
          >
            <View className="mr-4">
              {tapoutsRemaining === 0 ? (
                <HeartStraightBreakIcon size={tapoutIconSize} color={colors.textMuted} weight="fill" />
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
            <>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <View style={{ paddingVertical: s(buttonPadding.standard + 4), paddingHorizontal: s(buttonPadding.standard + 4) }} className="flex-row items-center justify-between">
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
        <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold} tracking-wider mb-2 mt-6`}>
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
