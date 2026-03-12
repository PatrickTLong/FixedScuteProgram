import React, { memo } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

function HourglassLoader() {
  const { colors } = useTheme();
  const { s } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <LottieView
        source={require('../frontassets/blue loading.json')}
        autoPlay
        loop
        resizeMode="contain"
        style={{ width: s(120), height: s(120) }}
      />
    </View>
  );
}

export default memo(HourglassLoader);
