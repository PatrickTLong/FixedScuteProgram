import React, { useState, useEffect, useCallback } from 'react';
import { Dimensions, Modal, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../context/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('screen').height;

interface SlideUpModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  /** Set to true to prevent closing via back button / backdrop tap */
  preventClose?: boolean;
  children: React.ReactNode;
}

export default function SlideUpModal({ visible, onRequestClose, preventClose, children }: SlideUpModalProps) {
  const progress = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(visible);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      requestAnimationFrame(() => {
        progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      });
    } else {
      progress.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0]) }],
  }));

  const handleRequestClose = useCallback(() => {
    if (!preventClose) onRequestClose?.();
  }, [preventClose, onRequestClose]);

  if (!modalVisible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <StatusBar backgroundColor="transparent" translucent />
      <View style={StyleSheet.absoluteFill}>
        <Reanimated.View style={backdropStyle}>
          <View style={StyleSheet.absoluteFill} onTouchEnd={handleRequestClose} />
        </Reanimated.View>
        <Reanimated.View style={containerStyle} renderToHardwareTextureAndroid>
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {children}
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
