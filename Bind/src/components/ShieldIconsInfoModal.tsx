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

interface ShieldIconsInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

// Shield icon with customizable color
const ShieldIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function ShieldIconsInfoModal({ visible, onClose }: ShieldIconsInfoModalProps) {
  const { colors } = useTheme();
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

            {/* Cyan Shield - Scheduled */}
            <View className="flex-row items-center mb-4">
              <View className="mr-3">
                <ShieldIcon color={colors.cyan} size={28} />
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

            {/* Purple Shield - Recurring */}
            <View className="flex-row items-center">
              <View className="mr-3">
                <ShieldIcon color="#a855f7" size={28} />
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
                  <View style={{ borderColor: '#FFFFFF' }} className="w-2 h-3 border-r-2 border-b-2 rotate-45 -mt-0.5" />
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
              <Text style={{ color: '#FFFFFF' }} className="text-base font-nunito-semibold">
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
