import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  AppState,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme, textSize, fontFamily, radius, shadow } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { AirplaneTakeoffIcon } from 'phosphor-react-native';

function NoInternetModal() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const { handleReconnect } = useAuth();
  const [visible, setVisible] = useState(false);
  const wasDisconnectedRef = useRef(false);

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
              <AirplaneTakeoffIcon size={s(28)} color={colors.text} weight="fill" />
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
            <Pressable
              onPress={handleRetry}
              android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false, foreground: true, radius: -1 }}
              className="py-4 items-center justify-center"
            >
              <Text style={{ color: colors.text }} className={`${textSize.small} ${fontFamily.semibold}`}>
                Retry
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(NoInternetModal);
