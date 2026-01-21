import React, { memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onAccept: () => void;
}

function TermsAcceptScreen({ onAccept }: Props) {
  const { colors } = useTheme();

  async function handleAcceptTerms() {
    await AsyncStorage.setItem('tos_accepted', 'true');
    onAccept();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-center px-4 py-3">
        <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Terms of Service</Text>
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

      {/* Accept Terms Section */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }} className="px-6 py-4">
        <Text style={{ color: colors.textSecondary }} className="text-sm text-white font-nunito text-center mb-4">
          Do you accept these Terms of Service?
        </Text>
        <TouchableOpacity
          onPress={handleAcceptTerms}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.green }}
          className="rounded-full py-4 items-center"
        >
          <Text style={{ color: '#000000' }} className="text-lg font-nunito-semibold">
            I Accept
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default memo(TermsAcceptScreen);
