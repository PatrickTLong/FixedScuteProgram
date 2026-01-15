import React, { memo, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface NFCScanModalProps {
  visible: boolean;
  onCancel: () => void;
  translateY: Animated.Value;
  bgFlash: Animated.Value;
  shakeAnimation: Animated.Value;
}

function NFCScanModal({
  visible,
  onCancel,
  translateY,
  bgFlash,
  shakeAnimation,
}: NFCScanModalProps) {
  const { colors, theme } = useTheme();

  // Theme-aware colors for the modal
  const handleColor = theme === 'dark' ? colors.border : '#ddd';
  const titleColor = theme === 'dark' ? colors.text : '#000';
  const subtitleColor = theme === 'dark' ? colors.textSecondary : '#666';
  const hintColor = theme === 'dark' ? colors.textMuted : '#999';

  // Background flash colors (success/error/neutral) - error, neutral, success
  const bgFlashColors = theme === 'dark'
    ? ['rgba(239, 68, 68, 0.2)', colors.card, 'rgba(34, 197, 94, 0.2)']
    : ['#FFEBEE', '#fff', '#B8E6C1'];

  // Icon circle background colors - error, neutral, success
  const iconBgColors = theme === 'dark'
    ? ['rgba(239, 68, 68, 0.3)', colors.cardLight, 'rgba(34, 197, 94, 0.3)']
    : ['#FFCDD2', '#E8F4FD', '#B8E6C1'];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onCancel();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onCancel}
        />

        <Animated.View
          style={{
            backgroundColor: bgFlash.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: bgFlashColors,
            }),
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 40,
            transform: [{ translateY }],
          }}
          {...panResponder.panHandlers}
        >
          <View style={{
            paddingTop: 12,
            paddingBottom: 20,
            alignItems: 'center',
          }}>
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: handleColor,
              borderRadius: 2,
            }} />
          </View>

          <Text style={{
            fontSize: 22,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 24,
            color: titleColor,
          }}>
            Ready to Scan
          </Text>

          <View style={{
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Animated.View style={{
              transform: [{ translateX: shakeAnimation }],
            }}>
              <Animated.View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: bgFlash.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: iconBgColors,
                }),
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 44,
                  height: 70,
                  borderRadius: 8,
                  borderWidth: 3,
                  borderColor: colors.cyan,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: 6,
                }}>
                  <View style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.cyan,
                  }} />
                </View>
              </Animated.View>
            </Animated.View>
          </View>

          <Text style={{
            fontSize: 16,
            color: subtitleColor,
            textAlign: 'center',
            paddingHorizontal: 24,
          }}>
            Hold your Scute near the NFC reader.
          </Text>

          <Text style={{
            fontSize: 13,
            color: hintColor,
            textAlign: 'center',
            marginTop: 16,
          }}>
            Swipe down to cancel
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(NFCScanModal);
