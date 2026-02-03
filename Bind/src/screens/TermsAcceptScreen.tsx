import React, { memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme , textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

function TermsAcceptScreen() {
  const { colors } = useTheme();
  const { handleTermsAccepted } = useAuth();

  async function handleAcceptTerms() {
    await AsyncStorage.setItem('tos_accepted', 'true');
    handleTermsAccepted();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }} className="flex-row items-center justify-center px-4 py-3">
        <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.semibold}`}>Terms of Service</Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-4`}>Terms of Service</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          Effective Date: January 6, 2026
        </Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          Welcome to Scute. By downloading, installing, or using the Scute mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>1. Acceptance of Terms</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          By accessing or using Scute, you confirm that you are at least 13 years of age and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>2. Description of Service</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          Scute is a digital wellness application designed to help users manage screen time by blocking access to selected applications, websites, and the Settings app on their device. The App uses accessibility services, usage access permissions, and notification access to enforce blocking functionality, including blocking notifications from restricted apps.{'\n\n'}
          The App supports scheduled sessions that can activate automatically at preset times without requiring user interaction at the time of activation. Blocking sessions persist across device restarts — if your device reboots during an active session, blocking will automatically resume when the device starts up.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>3. User Responsibilities</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          You are solely responsible for:{'\n'}
          • Configuring the App according to your preferences and needs.{'\n'}
          • Understanding that enabling blocking features will restrict access to selected apps and device settings.{'\n'}
          • Ensuring you have alternative means to access essential functions (such as emergency calls) during blocking sessions.{'\n'}
          • Any consequences resulting from your use of the App's blocking features.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>4. Assumption of Risk</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          You acknowledge and agree that:{'\n'}
          • The App is designed to intentionally restrict access to your device's applications and settings.{'\n'}
          • Blocking sessions cannot be easily bypassed once activated, which is a core feature of the App.{'\n'}
          • You use the App at your own risk and discretion.{'\n'}
          • You are responsible for ensuring blocking sessions do not interfere with essential device functions you may need.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>5. Disclaimer of Warranties</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>6. Limitation of Liability</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          If you experience any issues such as prolonged blocking due to bugs, unexpected behavior, or accidental activation, please contact our support team at support@scuteapp.com for assistance. We are committed to helping resolve any problems you may encounter.{'\n\n'}
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SCUTE AND ITS DEVELOPERS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n'}
          • Temporary inability to access blocked applications during a blocking session.{'\n'}
          • Missed notifications, messages, or communications during blocking sessions.{'\n'}
          • Any inconvenience or frustration caused by blocking features working as intended.{'\n'}
          • Any other damages arising from your use of the App.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>7. Indemnification</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          You agree to indemnify, defend, and hold harmless Scute and its developers, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) arising out of or in any way connected with your use of the App or violation of these Terms.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>8. Emergency Tapout Feature</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          The App provides an optional "Emergency Tapout" feature that allows users to end blocking sessions early. This feature is limited and subject to usage restrictions. We do not guarantee that the Emergency Tapout feature will always be available or functional. Users who disable this feature accept full responsibility for completing their blocking sessions.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>9. Account Termination</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          We reserve the right to suspend or terminate your account at any time for any reason, including but not limited to violation of these Terms. You may delete your account at any time through the App's settings if unblocked. Upon account deletion, your email address and all associated account data will be permanently removed from our servers.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>10. Subscriptions and Payments</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          Scute offers subscription plans and a lifetime purchase option:{'\n'}
          • Free Trial: New users receive a 7-day free trial with full access to all features.{'\n'}
          • Monthly Subscription: $6.95/month, billed monthly.{'\n'}
          • Yearly Subscription: $4.95/month ($59.40/year), billed annually.{'\n'}
          • Lifetime Purchase: $49.95 one-time payment for permanent access.{'\n\n'}
          Subscriptions are processed through Google Play. By subscribing, you agree to Google Play's terms of service. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage or cancel your subscription through Google Play Store settings. Refunds are handled according to Google Play's refund policy.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>11. Email Marketing</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          By creating an account and providing your email address, you agree to receive promotional emails, product updates, feature announcements, and other marketing communications from Scute. You may opt out of marketing emails at any time by using the unsubscribe link included in each email. Opting out of marketing emails will not affect transactional or account-related communications (such as account verification, security alerts, and service updates).
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>12. Modifications to Terms</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          We reserve the right to modify these Terms at any time. Changes will be effective upon posting within the App. Your continued use of the App after any modifications constitutes acceptance of the updated Terms.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>13. Governing Law</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scute operates, without regard to conflict of law principles.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>14. Severability</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
        </Text>

        <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-2`}>15. Contact Us</Text>
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-4`}>
          If you have any questions about these Terms of Service, please contact us at:{'\n'}
          Email: info@scuteapp.com
        </Text>

        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center mb-8`}>
          © 2026 Scute LLC
        </Text>
      </ScrollView>

      {/* Accept Terms Section */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.bg }} className="px-6 py-4">
        <Text style={{ color: colors.textSecondary }} className={`${textSize.small} text-white ${fontFamily.regular} text-center mb-4`}>
          Do you accept these Terms of Service?
        </Text>
        <TouchableOpacity
          onPress={() => { lightTap(); handleAcceptTerms(); }}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card }}
          className={`${radius.full} py-4 items-center`}
        >
          <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
            I Accept
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default memo(TermsAcceptScreen);
