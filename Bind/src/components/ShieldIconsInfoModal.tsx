import React, { memo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import { BookmarkSimpleIcon, ArrowsClockwiseIcon } from 'phosphor-react-native';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface ShieldIconsInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

// Bookmark icon for scheduled presets
const BookmarkIcon = ({ color, size = iconSize.lg }: { color: string; size?: number }) => (
  <BookmarkSimpleIcon size={size} color={color} weight="fill" />
);

// Rotate CW icon for recurring presets
const RotateCwIcon = ({ color, size = iconSize.lg }: { color: string; size?: number }) => (
  <ArrowsClockwiseIcon size={size} color={color} weight="fill" />
);

function ShieldIconsInfoModal({ visible, onClose }: ShieldIconsInfoModalProps) {
  const { colors } = useTheme();
  const { s } = useResponsive();

  const handleClose = () => {
    onClose(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable className="flex-1" onPress={handleClose}>
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.card,
                ...shadow.modal,
              }}
              className={`w-full ${radius['2xl']} overflow-hidden`}
            >
              {/* Content */}
              <View className="p-6">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-4`}>
                  Preset Icons
                </Text>

                {/* Bookmark - Scheduled */}
                <View className="flex-row items-center mb-4">
                  <View className="mr-3">
                    <BookmarkIcon color={colors.text} size={28} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
                      Scheduled
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                      This preset has a scheduled start and end time.
                    </Text>
                  </View>
                </View>

                {/* White Refresh - Recurring */}
                <View className="flex-row items-center">
                  <View className="mr-3">
                    <RotateCwIcon color={colors.text} size={28} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.semibold}`}>
                      Recurring
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                      This preset repeats automatically on a schedule.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Button */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
                <Pressable
                  onPress={handleClose}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
                  className="py-4 items-center justify-center"
                >
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Dismiss
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(ShieldIconsInfoModal);
