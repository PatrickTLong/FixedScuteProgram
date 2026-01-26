import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';

interface PresetGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

function PresetGuideModal({ visible, onClose }: PresetGuideModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
          <View className="w-16" />
          <Text style={{ color: colors.text }} className="text-lg font-nunito-semibold">Preset Guide</Text>
          <TouchableOpacity onPress={() => { lightTap(); onClose(); }} className="w-16 items-end">
            <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito">Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {/* Introduction */}
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            This guide explains all the settings available when creating or editing a preset. Read carefully to understand how each option affects your blocking.
          </Text>

          {/* Apps Selection */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">1. Apps Selection</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Choose which apps to block. You can select individual apps or use "Select All" to block everything at once.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            Certain essential apps (Phone, Camera, Emergency, Messaging) are excluded from the list to ensure you can always access critical functions.
          </Text>

          {/* Websites */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">2. Websites</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Block specific websites by entering their domain (e.g., instagram.com, reddit.com). Blocked websites will be inaccessible in supported browsers.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Tip: </Text>
            Enter just the domain without "https://" or "www." - for example, use "instagram.com" not "https://www.instagram.com".
          </Text>

          {/* No Time Limit */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">3. No Time Limit</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            When enabled, the block will remain active indefinitely until you manually unlock it. There is no automatic end time.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Warning: </Text>
            Without a time limit, you must manually end the block. If you disable Emergency Tapout and Strict Mode is on, you may be locked out until device restart or uninstall.
          </Text>

          {/* Block Settings App */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">4. Block Settings App</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Prevents access to the Android Settings app during an active block. This stops you from easily disabling app permissions or uninstalling Scute.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            WiFi settings remain accessible via the quick settings panel so you can still connect to networks.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Warning: </Text>
            With Settings blocked, you cannot change system settings, manage apps, or access certain device features until the block ends.
          </Text>

          {/* Strict Mode */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">5. Strict Mode</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            When enabled, the overlay cannot be dismissed using the slide-to-unlock button. The only ways to end the block are:{'\n'}
            • Wait for the timer to expire{'\n'}
            • Use an Emergency Tapout (if enabled)
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            This setting only appears when a time limit is set (No Time Limit is OFF).
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Warning: </Text>
            Strict Mode is serious - once activated, you cannot easily exit the block. Make sure you really want to commit to the full duration before enabling this.
          </Text>

          {/* Continue Anyway (Non-Strict Mode) */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">5b. Continue Anyway (Non-Strict Mode)</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            When Strict Mode is OFF, a "Continue anyway" button appears on the blocking overlay. Pressing this button removes that specific app or website from the blocked list for the current session.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">How it works: </Text>
            {'\n'}• Tap "Continue anyway" to unblock the app/website you tried to open
            {'\n'}• The app/website is removed from the blocked list for this session only
            {'\n'}• If this was the last blocked item, the entire session ends automatically
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            This feature is designed for flexible blocking where you might need occasional access. If you want no escape, enable Strict Mode instead.
          </Text>

          {/* Allow Emergency Tapout */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">6. Allow Emergency Tapout</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Emergency Tapouts are your safety net. When enabled, you can use one of your limited tapouts to immediately end a Strict Mode block in case of a genuine emergency.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            This setting only appears when Strict Mode is ON.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            You have a limited number of Emergency Tapouts. Use them wisely. They refill +1 every two weeks.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Warning: </Text>
            Disabling Emergency Tapout means there is NO way out of a Strict Mode block except waiting. Only disable this if you are absolutely certain.
          </Text>

          {/* Schedule for Later */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">7. Schedule for Later</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Instead of starting a block immediately, you can schedule it for a future date and time. Set both a start and end time for the block.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            When scheduling is enabled, the timer picker and "No Time Limit" options are hidden since the duration is determined by your scheduled times.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            The end date must be after the start date. Scheduled blocks will automatically activate when the start time is reached.
          </Text>

          {/* Recurring Schedule */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">8. Recurring Schedule</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Make your scheduled block repeat automatically. Choose how often the block should recur (minutes, hours, days, weeks, or months).
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            This setting only appears after you've set valid start and end dates.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">How it works: </Text>
            {'\n'}• Minutes/Hours: The next block starts after the interval from when the previous block ends
            {'\n'}• Days/Weeks/Months: The block occurs at the same time slot on the recurring date
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Example: </Text>
            A block from 9 AM - 5 PM repeating every 1 day will block you from 9 AM to 5 PM every single day.
          </Text>

          {/* Duration (Timer) */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">9. Duration (Timer)</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Set a specific duration for your block using days, hours, minutes, and seconds. The block will automatically end when the timer reaches zero.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            This option is only visible when both "No Time Limit" and "Schedule for Later" are disabled.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Tip: </Text>
            Start with shorter durations to test your settings before committing to longer blocks, especially with Strict Mode enabled.
          </Text>

          {/* Pick a Date */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">10. Pick a Date</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-2">
            Instead of a countdown timer, you can set the block to end at a specific date and time. This is useful when you know exactly when you want access restored.
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-4">
            <Text style={{ color: colors.text }} className="font-nunito-semibold">Note: </Text>
            The date must be in the future. Using "Pick a Date" will clear any timer duration you've set, and vice versa.
          </Text>

          {/* Final Notes */}
          <Text style={{ color: colors.text }} className="text-base font-nunito-bold mb-2">Remember</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito leading-5 mb-8">
            Scute is designed to help you stay focused. Use these settings responsibly. Start with lenient settings and gradually increase restrictions as you build better habits.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default memo(PresetGuideModal);
