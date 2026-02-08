import React, { memo, useCallback, useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import { useResponsive } from '../utils/responsive';

const PULSE_SIZE = 24;
const PULSE_DURATION = 100;

interface HeaderIconButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: any;
  className?: string;
}

function HeaderIconButton({ onPress, disabled = false, children, style, className }: HeaderIconButtonProps) {
  const { s } = useResponsive();
  const pulseProgress = useRef(new Animated.Value(1)).current;

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2],
  });

  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const triggerPulse = useCallback(() => {
    if (disabled) return;
    pulseProgress.setValue(0);
    Animated.timing(pulseProgress, {
      toValue: 1,
      duration: PULSE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [disabled, pulseProgress]);

  const scaledSize = s(PULSE_SIZE);

  return (
    <TouchableOpacity
      onPressIn={triggerPulse}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={style}
      className={className || 'px-2'}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: scaledSize,
            height: scaledSize,
            borderRadius: scaledSize / 2,
            backgroundColor: '#ffffff',
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          }}
        />
        {children}
      </View>
    </TouchableOpacity>
  );
}

export default memo(HeaderIconButton);
