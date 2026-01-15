import React, { useState, useEffect, memo } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ConfirmationModal from '../components/ConfirmationModal';
import { getLockStatus, getEmergencyTapoutStatus, EmergencyTapoutStatus, invalidateUserCaches, saveUserTheme } from '../services/cardApi';
import { useTheme } from '../context/ThemeContext';

interface Props {
  email: string;
  onLogout: () => void;
  onResetAccount: () => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

// Icons - now accept color prop
const MailIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6l-10 7L2 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LogoutIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RefreshIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6M1 20v-6h6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CardIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zM2 10h20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MessageIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BugIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SunIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UnlockIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 11V7a5 5 0 019.9-1"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShieldIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FileTextIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TapoutIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
      stroke={color}
      strokeWidth={2}
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
  arrowColor?: string;
}

const SettingsRow = ({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  labelColor,
  isLast = false,
  borderColor,
  valueColor,
  arrowColor,
}: SettingsRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
    style={!isLast ? { borderBottomWidth: 1, borderBottomColor: borderColor } : undefined}
    className="flex-row items-center py-4"
  >
    <View className="mr-4">{icon}</View>
    <Text style={{ color: labelColor }} className="flex-1 text-base font-nunito">{label}</Text>
    {value && (
      <Text style={{ color: valueColor }} className="text-sm font-nunito mr-2">{value}</Text>
    )}
    {showArrow && onPress && (
      <Text style={{ color: arrowColor }} className="text-lg">{'>'}</Text>
    )}
  </TouchableOpacity>
);

function SettingsScreen({ email, onLogout, onResetAccount, onDeleteAccount }: Props) {
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [lockChecked, setLockChecked] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Theme state
  const { theme, setTheme, colors } = useTheme();

  // Emergency Tapout state
  const [tapoutStatus, setTapoutStatus] = useState<EmergencyTapoutStatus | null>(null);

  // Fetch lock status FIRST before anything else
  useEffect(() => {
    checkLockStatus();
  }, [email]);

  async function checkLockStatus() {
    // Clear caches to ensure fresh data on mount
    invalidateUserCaches(email);

    // Fetch all data in parallel
    const [status, tapout] = await Promise.all([
      getLockStatus(email, true),
      getEmergencyTapoutStatus(email),
    ]);

    setIsLocked(status.isLocked);
    setTapoutStatus(tapout);
    setLockChecked(true);
  }

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

  const handleContactSupport = () => {
    if (isLocked) return;
    Linking.openURL('mailto:support@scuteapp.com?subject=Scute%20Support%20Request');
  };

  const handleBugReport = () => {
    if (isLocked) return;
    Linking.openURL('mailto:info@scuteapp.com?subject=Scute%20Bug%20Report');
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    // Save to backend
    await saveUserTheme(email, newTheme);
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    onLogout();
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

  const handleDeleteAccount = async () => {
    setDeleteAccountModalVisible(false);
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
  const isDisabled = !lockChecked || isLocked === true;

  // Show full-screen loading for initial load or any action in progress
  if (!lockChecked || isResetting || isDeleting) {
    let loadingMessage = '';
    if (!lockChecked) {
      loadingMessage = '';
    } else if (isResetting) {
      loadingMessage = 'Resetting Account...';
    } else if (isDeleting) {
      loadingMessage = 'Deleting Account...';
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={colors.green} />
        {loadingMessage ? (
          <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold mt-4">{loadingMessage}</Text>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Locked Overlay */}
      {isLocked && (
        <View style={{ backgroundColor: colors.bg + 'F2' }} className="absolute inset-0 z-50 items-center justify-center">
          <Image
            source={require('../frontassets/scutelogo.png')}
            style={{ width: 120, height: 120, tintColor: colors.logoTint, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text style={{ color: colors.text }} className="text-xl font-nunito-bold mb-2">Phone is Locked</Text>
          <Text style={{ color: colors.textSecondary }} className="text-center font-nunito px-8">
            Settings cannot be changed while blocking is active.
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ACCOUNT Section */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-2">
          Account
        </Text>
        <View style={{ backgroundColor: colors.card }} className="rounded-2xl px-4 mb-6">
          <SettingsRow
            icon={<MailIcon color={colors.textSecondary} />}
            label={email}
            showArrow={false}
            labelColor={colors.text}
            borderColor={colors.border}
          />
          <SettingsRow
            icon={<LogoutIcon color={colors.textSecondary} />}
            label="Log Out"
            onPress={isDisabled ? undefined : () => setLogoutModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
            isLast
          />
        </View>

        {/* DATA Section */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-2">
          Data
        </Text>
        {resetError && (
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }} className="rounded-xl px-4 py-3 mb-3">
            <Text style={{ color: colors.red }} className="text-sm font-nunito">{resetError}</Text>
          </View>
        )}
        {deleteError && (
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }} className="rounded-xl px-4 py-3 mb-3">
            <Text style={{ color: colors.red }} className="text-sm font-nunito">{deleteError}</Text>
          </View>
        )}
        <View style={{ backgroundColor: colors.card }} className="rounded-2xl px-4 mb-6">
          <SettingsRow
            icon={<RefreshIcon color={colors.textSecondary} />}
            label="Reset Account"
            onPress={isDisabled ? undefined : () => setResetModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
          />
          <SettingsRow
            icon={<TrashIcon color={colors.red} />}
            label="Delete Account"
            onPress={isDisabled ? undefined : () => setDeleteAccountModalVisible(true)}
            labelColor={colors.red}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
            isLast
          />
        </View>

        {/* EMERGENCY TAPOUT Section */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-2">
          Emergency Tapout
        </Text>
        <View style={{ backgroundColor: colors.card }} className="rounded-2xl px-4 mb-6">
          {/* Header Row */}
          <View
            style={getTimeUntilRefill() ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
            className="flex-row items-center py-4"
          >
            <View className="mr-4">
              <TapoutIcon color={colors.green} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-base font-nunito">Tapouts Remaining</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-0.5">
                Unlock your phone in emergencies
              </Text>
            </View>
            <Text style={{ color: colors.text }} className="text-lg font-nunito-bold">
              {tapoutStatus?.remaining ?? 0}/3
            </Text>
          </View>

          {/* Refill Timer Row - shows when below 3 tapouts */}
          {tapoutStatus && getTimeUntilRefill() && (
            <View className="flex-row items-center justify-between py-4">
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">Next Refill</Text>
              <Text style={{ color: colors.green }} className="text-sm font-nunito-semibold">
                {getTimeUntilRefill()}
              </Text>
            </View>
          )}
        </View>

        {/* SUPPORT Section */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito uppercase tracking-wider mb-2">
          Support
        </Text>
        <View style={{ backgroundColor: colors.card }} className="rounded-2xl px-4">
          <SettingsRow
            icon={<MessageIcon color={colors.textSecondary} />}
            label="Contact Support"
            onPress={isDisabled ? undefined : handleContactSupport}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
          />
          <SettingsRow
            icon={<BugIcon color={colors.textSecondary} />}
            label="Bug Report"
            onPress={isDisabled ? undefined : handleBugReport}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
          />
          <SettingsRow
            icon={<ShieldIcon color={colors.textSecondary} />}
            label="Privacy Policy"
            onPress={() => setPrivacyModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
          />
          <SettingsRow
            icon={<FileTextIcon color={colors.textSecondary} />}
            label="Terms of Service"
            onPress={() => setTermsModalVisible(true)}
            labelColor={colors.text}
            borderColor={colors.border}
            arrowColor={colors.textSecondary}
            isLast
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
        message="This will delete all your presets and settings. Your account will remain active."
        confirmText="Reset"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleResetAccount}
        onCancel={() => setResetModalVisible(false)}
      />

      {/* Delete Account Modal */}
      <ConfirmationModal
        visible={deleteAccountModalVisible}
        title="Delete Account"
        message="This will permanently delete your account, delete all the data associated with your account, unregister your Scute, and return you to the onboarding screen. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="fade"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
            <View className="w-16" />
            <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Privacy Policy</Text>
            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} className="w-16 items-end">
              <Text style={{ color: colors.green }} className="text-base font-nunito">Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-4">Privacy Policy</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Thank you for using Scute. Your privacy is important to us, and this Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">1. Information We Collect</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
              We collect the following types of information:
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              • Email Address: Collected during account registration to identify your account.{'\n'}
              • App Usage Data: We access app usage statistics on your device to track screen time and enforce app-blocking features. This data is processed locally on your device and is not transmitted to our servers.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">2. How We Use Your Information</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We use your information for the following purposes:{'\n'}
              • To create and manage your account.{'\n'}
              • To enable core app functionality, such as app blocking and screen time tracking.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">3. Data Storage and Security</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              • Your email address is stored securely in our cloud database (powered by Supabase).{'\n'}
              • App usage data is stored locally on your device and is not uploaded to our servers.{'\n'}
              • We use industry-standard encryption to protect data in transit and at rest.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">4. Third-Party Services</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We use the following third-party services:{'\n'}
              • Supabase: For secure cloud storage and authentication.{'\n'}
              These services have their own privacy policies, and we encourage you to review them.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">5. Permissions</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              To provide our services, the app requires the following permissions:{'\n'}
              • Usage Access: To monitor and block apps on your device.{'\n'}
              • Display Over Other Apps: To show blocking overlays.{'\n'}
              • Accessibility Services: To enforce app-blocking functionality.{'\n'}
              These permissions are used solely for the app's intended functionality.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">6. Data Sharing</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We do not sell, rent, or share your personal information with third parties, except:{'\n'}
              • When required by law.{'\n'}
              • To protect the rights, safety, or property of Scute or its users.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">7. Your Rights</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              You have the right to:{'\n'}
              • Access, update, or delete your account information.{'\n'}
              • Revoke app permissions at any time through your device settings.{'\n'}
              To exercise these rights, contact us at info@scuteapp.com.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">8. Children's Privacy</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Scute is not intended for children under the age of 13. We do not knowingly collect personal information from children.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">9. Changes to This Policy</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We may update this Privacy Policy from time to time. Any changes will be posted in the app, and the "Effective Date" will be updated accordingly.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">10. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-8">
              If you have any questions or concerns about this Privacy Policy, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="fade"
        presentationStyle="pageSheet"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
            <View className="w-16" />
            <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Terms of Service</Text>
            <TouchableOpacity onPress={() => setTermsModalVisible(false)} className="w-16 items-end">
              <Text style={{ color: colors.green }} className="text-base font-nunito">Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-4">Terms of Service</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Effective Date: January 6, 2026
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Welcome to Scute. By downloading, installing, or using the Scute mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">1. Acceptance of Terms</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              By accessing or using Scute, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">2. Description of Service</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              Scute is a digital wellness application designed to help users manage screen time by blocking access to selected applications and the Settings app on their device. The App uses accessibility services, usage access permissions, and device administrator features to enforce blocking functionality.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">3. User Responsibilities</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              You are solely responsible for:{'\n'}
              • Configuring the App according to your preferences and needs.{'\n'}
              • Understanding that enabling blocking features will restrict access to selected apps and device settings.{'\n'}
              • Ensuring you have alternative means to access essential functions (such as emergency calls) during blocking sessions.{'\n'}
              • Any consequences resulting from your use of the App's blocking features.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">4. Assumption of Risk</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              You acknowledge and agree that:{'\n'}
              • The App is designed to intentionally restrict access to your device's applications and settings.{'\n'}
              • Blocking sessions cannot be easily bypassed once activated, which is a core feature of the App.{'\n'}
              • You use the App at your own risk and discretion.{'\n'}
              • You are responsible for ensuring blocking sessions do not interfere with essential device functions you may need.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">5. Disclaimer of Warranties</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">6. Limitation of Liability</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              If you experience any issues such as prolonged blocking due to bugs, unexpected behavior, or accidental activation, please contact our support team at support@scuteapp.com for assistance. We are committed to helping resolve any problems you may encounter.{'\n\n'}
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCUTE AND ITS DEVELOPERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n'}
              • Temporary inability to access blocked applications during a blocking session.{'\n'}
              • Missed notifications, messages, or communications during blocking sessions.{'\n'}
              • Any inconvenience or frustration caused by blocking features working as intended.{'\n'}
              • Any other damages arising from your use of the App.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">7. Indemnification</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              You agree to indemnify, defend, and hold harmless Scute and its developers, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with your use of the App or violation of these Terms.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">8. Emergency Tapout Feature</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              The App provides an optional "Emergency Tapout" feature that allows users to end blocking sessions early. This feature is limited and subject to usage restrictions. We do not guarantee that the Emergency Tapout feature will always be available or functional. Users who disable this feature accept full responsibility for completing their blocking sessions.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">9. Account Termination</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms. You may delete your account at any time through the App's settings if unblocked.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">10. Modifications to Terms</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Your continued use of the App after any modifications constitutes acceptance of the updated Terms.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">11. Governing Law</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scute operates, without regard to conflict of law principles.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">12. Severability</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">13. Contact Us</Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-8">
              If you have any questions about these Terms of Service, please contact us at:{'\n'}
              Email: info@scuteapp.com
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(SettingsScreen);
