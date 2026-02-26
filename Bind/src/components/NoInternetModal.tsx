import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  AppState,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme, textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import Svg, { Path } from 'react-native-svg';

function NoInternetModal() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleReconnect } = useAuth();
  const [visible, setVisible] = useState(false);
  const wasDisconnectedRef = useRef(false);
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const isDisconnected = state.isConnected === false;
      if (isDisconnected) {
        wasDisconnectedRef.current = true;
      } else if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        handleReconnect();
      }
      setVisible(isDisconnected);
    });

    return () => unsubscribe();
  }, [handleReconnect]);

  // Also re-check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        NetInfo.fetch().then(state => {
          const isDisconnected = state.isConnected === false;
          if (isDisconnected) {
            wasDisconnectedRef.current = true;
          } else if (wasDisconnectedRef.current) {
            wasDisconnectedRef.current = false;
            handleReconnect();
          }
          setVisible(isDisconnected);
        });
      }
    });

    return () => subscription.remove();
  }, [handleReconnect]);

  const triggerFlash = useCallback((anim: Animated.Value) => {
    anim.setValue(0.3);
    Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleRetry = useCallback(() => {
    NetInfo.fetch().then(state => {
      const isDisconnected = state.isConnected === false;
      if (!isDisconnected && wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        handleReconnect();
      }
      setVisible(isDisconnected);
    });
  }, [handleReconnect]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadow.modal,
          }}
          className={`w-full ${radius['2xl']} overflow-hidden`}
        >
          {/* Icon + Content */}
          <View className="p-6 items-center">
            <View
              style={{
                backgroundColor: colors.cardLight,
                borderWidth: 1,
                borderColor: colors.cardLight,
                width: s(56),
                height: s(56),
                borderRadius: s(28),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: s(16),
              }}
            >
              <Svg width={s(28)} height={s(28)} viewBox="0 -960 960 960" fill={colors.red}>
                <Path d="M250-320h60v-10q0-71 49.5-120.5T480-500q71 0 120.5 49.5T650-330v10h60v-10q0-96-67-163t-163-67q-96 0-163 67t-67 163v10Zm34-270q41-6 86.5-32t72.5-59l-46-38q-20 24-55.5 44T276-650l8 60Zm392 0 8-60q-30-5-65.5-25T563-719l-46 38q27 33 72.5 59t86.5 32ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5Z" />
              </Svg>
            </View>
            <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold} text-center mb-2`}>
              No Internet Connection
            </Text>
            <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-5`}>
              This app requires internet for all features to work properly.
            </Text>
          </View>

          {/* Retry Button */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
            <TouchableOpacity
              onPressIn={() => triggerFlash(flash)}
              onPress={handleRetry}
              activeOpacity={1}
              className="py-4 items-center justify-center"
            >
              <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', opacity: flash }} />
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(NoInternetModal);
