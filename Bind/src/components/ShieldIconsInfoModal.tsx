import React, { memo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme , textSize, fontFamily, radius, shadow, iconSize } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

interface ShieldIconsInfoModalProps {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

// Bookmark icon (Feather Icons) for scheduled presets
const BookmarkIcon = ({ color, size = iconSize.lg }: { color: string; size?: number }) => (
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
const RotateCwIcon = ({ color, size = iconSize.lg }: { color: string; size?: number }) => (
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
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    flash.stopAnimation(() => flash.setValue(0));
  }, [visible]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

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
                borderWidth: 1, borderColor: colors.border,
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
                <TouchableOpacity
                  onPressIn={() => triggerFlash(flash)}
                  onPress={handleClose}
                  activeOpacity={1}
                  className="py-4 items-center justify-center"
                >
                  <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: flash }} />
                  <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(ShieldIconsInfoModal);
