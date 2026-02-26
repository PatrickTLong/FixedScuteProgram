import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Text,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { useTheme, textSize, fontFamily, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import type { AuthStackParamList } from '../navigation/types';

const SCUTE_ICON_PATH =
  'M320-480v80q0 66 47 113t113 47q66 0 113-47t47-113v-80H320Zm160 180q-42 0-71-29t-29-71v-20h200v20q0 42-29 71t-71 29ZM272.5-652.5Q243-625 231-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T340-680q-38 0-67.5 27.5Zm280 0Q523-625 511-577l58 14q6-26 20-41.5t31-15.5q17 0 31 15.5t20 41.5l58-14q-12-48-41.5-75.5T620-680q-38 0-67.5 27.5ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5Z';

function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { colors } = useTheme();
  const { s } = useResponsive();

  const slideValue = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Bouncy slide-in from bottom
    Animated.spring(slideValue, {
      toValue: 0,
      speed: 14,
      bounciness: 16,
      useNativeDriver: true,
    }).start(() => {
      // Fade in text after icon lands
      setReady(true);
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const slideTranslateY = slideValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const slideOpacity = slideValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  const handleTap = () => {
    if (ready) {
      if (haptics.landingTap.enabled) {
        triggerHaptic(haptics.landingTap.type);
      }
      navigation.navigate('GetStarted');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pressable onPress={handleTap} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* Icon with bouncy slide-in */}
        <Animated.View style={{ transform: [{ translateY: slideTranslateY }], opacity: slideOpacity }}>
          <Svg width={s(120)} height={s(120)} viewBox="0 -960 960 960" fill={colors.text}>
            <Path d={SCUTE_ICON_PATH} />
          </Svg>
        </Animated.View>

        {/* Welcome text fades in after icon lands */}
        <Animated.View style={{ opacity: textOpacity, marginTop: s(24) }}>
          <Text style={{ color: colors.text }} className={`${textSize['2xLarge']} ${fontFamily.bold} text-center`}>
            Welcome to Scute!
          </Text>
        </Animated.View>
      </Pressable>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
