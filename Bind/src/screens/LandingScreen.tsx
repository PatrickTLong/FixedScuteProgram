import React, { memo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedGradientText from '../components/AnimatedGradientText';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onSignIn: () => void;
  onGetStarted: () => void;
}

function LandingScreen({ onSignIn, onGetStarted }: Props) {
  const { colors } = useTheme();

  const handleScuteLink = () => {
    Linking.openURL('https://scuteapp.com');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View className="flex-1 justify-center items-center px-8">
        {/* Scute Logo */}
        <Image
          source={require('../frontassets/scutelogo.png')}
          className="w-72 h-72 mb-8"
          resizeMode="contain"
          style={{ tintColor: colors.logoTint, marginTop: -60 }}
        />

        {/* Title */}
        <View className="flex-row items-baseline justify-center mb-4">
          <Text style={{ color: colors.text }} className="text-3xl font-nunito-bold">This is </Text>
          <AnimatedGradientText text="Scute!" />
        </View>

        {/* Subtitle */}
        <Text style={{ color: colors.textSecondary }} className="text-center text-base font-nunito leading-6 px-4">
          A simple way to block distractions and enjoy more of what matters.
        </Text>
      </View>

      {/* Bottom Section */}
      <View className="px-6 pb-8">
        {/* Get Started Button */}
        <TouchableOpacity
          onPress={onGetStarted}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.text }}
          className="rounded-full py-4 items-center mb-4"
        >
          <Text style={{ color: colors.bg }} className="text-lg font-nunito-semibold">
            Get Started
          </Text>
        </TouchableOpacity>

        {/* Still need a Scute link */}
        <TouchableOpacity
          onPress={handleScuteLink}
          activeOpacity={0.7}
          className="items-center py-2"
        >
          <Text style={{ color: colors.textSecondary }} className="text-base font-nunito">
            Still need a Scute?
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default memo(LandingScreen);
