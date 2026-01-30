import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

interface ShieldIconsInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

// Bookmark icon (Feather Icons) for scheduled presets
const BookmarkIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Rotate CW icon (Feather Icons) for recurring presets
const RotateCwIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 4v6h-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function ShieldIconsInfoModal({ visible, onClose }: ShieldIconsInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    lightTap();
    onClose(dontShowAgain);
    setDontShowAgain(false); // Reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-6">
        <View style={{ backgroundColor: colors.card }} className="w-full rounded-2xl overflow-hidden">
          {/* Content */}
          <View className="p-6">
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold text-center mb-4">
              Preset Icons
            </Text>

            {/* Bookmark - Scheduled */}
            <View className="flex-row items-center mb-4">
              <View className="mr-3">
                <BookmarkIcon color="#FFFFFF" size={28} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                  Scheduled
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                  This preset has a scheduled start and end time.
                </Text>
              </View>
            </View>

            {/* White Refresh - Recurring */}
            <View className="flex-row items-center">
              <View className="mr-3">
                <RotateCwIcon color="#FFFFFF" size={28} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-base font-nunito-semibold">
                  Recurring
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                  This preset repeats automatically on a schedule.
                </Text>
              </View>
            </View>

            {/* Don't show again checkbox */}
            <TouchableOpacity
              onPress={() => { lightTap(); setDontShowAgain(!dontShowAgain); }}
              activeOpacity={0.7}
              className="flex-row items-center justify-center mt-6"
            >
              <View
                style={{
                  backgroundColor: dontShowAgain ? '#22c55e' : 'transparent',
                  borderColor: dontShowAgain ? '#22c55e' : colors.textSecondary,
                }}
                className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
              >
                {dontShowAgain && (
                  <View
                    style={{
                      width: s(8),
                      height: s(13),
                      borderRightWidth: 2.5,
                      borderBottomWidth: 2.5,
                      borderColor: '#FFFFFF',
                      transform: [{ rotate: '45deg' }],
                      marginTop: s(-2),
                    }}
                  />
                )}
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">
                Don't show this again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Button */}
          <View style={{ borderTopColor: colors.border }} className="border-t">
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              className="py-4 items-center"
            >
              <Text style={{ color: '#FFFFFF' }} className="text-sm font-nunito-semibold">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(ShieldIconsInfoModal);
