import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme , textSize, fontFamily } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';

interface PresetGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

function PresetGuideModal({ visible, onClose }: PresetGuideModalProps) {
  const { colors } = useTheme();
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      contentFadeAnim.setValue(0);
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Animated.View renderToHardwareTextureAndroid={true} style={{ flex: 1, opacity: contentFadeAnim }}>
          <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center justify-between px-4 py-3">
          <View className="w-16" />
          <Text style={{ color: colors.text }} className={`${textSize.large} ${fontFamily.semibold}`}>Preset Guide</Text>
          <TouchableOpacity onPress={() => { lightTap(); onClose(); }} className="w-16 items-end">
            <Text style={{ color: '#FFFFFF' }} className={`${textSize.base} ${fontFamily.regular}`}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {/* Apps Selection */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Apps</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Select apps to block. Essential apps (Phone, Camera, Emergency) are excluded.
          </Text>

          {/* Websites */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Websites</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Block domains like "instagram.com" (without https:// or www).
          </Text>

          {/* No Time Limit */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>No Time Limit</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Block stays active until manually ended. With Strict Mode on and no Emergency Tapout, you may be locked out indefinitely.
          </Text>

          {/* Block Settings App */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Block Settings App</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Prevents access to Android Settings during the block. WiFi remains accessible via quick settings.
          </Text>

          {/* Strict Mode */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Strict Mode</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Removes the slide-to-unlock option & the ability to dismiss a blocked app. Only exits: timer expiring or Emergency Tapout (if enabled). Only available with a time limit set.
          </Text>

          {/* Continue Anyway */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Continue Anyway</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            When Strict Mode is OFF, tap "Continue anyway" to unblock that app/website for the current session only.
          </Text>

          {/* Emergency Tapout */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Emergency Tapout</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Your safety net for Strict Mode blocks. Limited uses that refill +1 every two weeks. Disabling means NO way out except waiting.
          </Text>

          {/* Schedule */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Schedule for Later</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Set a future start and end time. Hides timer options since duration is determined by your schedule.
          </Text>

          {/* Recurring */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Recurring Schedule</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Repeat blocks automatically (daily, weekly, etc.). Example: 9 AM - 5 PM every day.
          </Text>

          {/* Duration */}
          <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} mb-1`}>Duration / Pick a Date</Text>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-3`}>
            Set block length via timer or specific end date. Available when "No Time Limit" and scheduling are off.
          </Text>

          {/* Tip */}
          <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }} className={`${textSize.small} ${fontFamily.regular} leading-5 mb-6`}>
            Start with lenient settings and gradually increase restrictions as you build better habits.
          </Text>
        </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(PresetGuideModal);
