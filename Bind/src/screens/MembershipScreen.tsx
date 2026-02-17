import React, { memo, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme , textSize, fontFamily, radius, shadow, buttonPadding, iconSize, colors } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

// Badge Checkmark Icon
const MagicWandIcon = ({ size = iconSize.lg }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill={colors.green} d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Z" />
    <Path fill="#FFFFFF" d="M15.61 10.186a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
  </Svg>
);

function MembershipScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime' | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View className="items-center mb-6 mt-4">
          <View className="flex-row items-center mb-3">
            <MagicWandIcon size={s(iconSize.xl)} color={colors.text} />
            <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold} ml-2`}>Choose Your Plan</Text>
          </View>
          <Text style={{ color: colors.textSecondary }} className={`text-center ${textSize.extraSmall} ${fontFamily.regular}`}>
            Your free trial has ended. Subscribe to continue using Scute.
          </Text>
        </View>

        {/* Monthly Plan */}
        <TouchableOpacity
          onPress={() => setSelectedPlan('monthly')}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'monthly' ? colors.text : 'transparent',
            padding: s(buttonPadding.standard),
            ...shadow.card,
          }}
          className={`${radius['2xl']} mb-3`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Monthly</Text>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                Billed monthly
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$9.95</Text>
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$6.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Yearly Plan */}
        <TouchableOpacity
          onPress={() => setSelectedPlan('yearly')}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'yearly' ? colors.text : 'transparent',
            padding: s(buttonPadding.standard),
            ...shadow.card,
          }}
          className={`${radius['2xl']} mb-3`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Yearly</Text>
                <View style={{ backgroundColor: colors.border, ...shadow.card }} className={`ml-2 px-2 py-0.5 ${radius.full}`}>
                  <Text className={`${textSize.extraSmall} ${fontFamily.bold} text-white`}>Save 29%</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                $59.40 billed annually
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$6.95</Text>
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$4.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Lifetime Plan */}
        <TouchableOpacity
          onPress={() => setSelectedPlan('lifetime')}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'lifetime' ? colors.text : 'transparent',
            padding: s(buttonPadding.standard),
            ...shadow.card,
          }}
          className={`${radius['2xl']} mb-6`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className={`${textSize.base} ${fontFamily.bold}`}>Lifetime</Text>
                <View style={{ backgroundColor: colors.border, ...shadow.card }} className={`ml-2 px-2 py-0.5 ${radius.full}`}>
                  <Text className={`${textSize.extraSmall} ${fontFamily.bold} text-white`}>Best Value</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular} mt-1`}>
                One-time payment, forever access
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular} mr-2`}>$79.95</Text>
                <Text style={{ color: colors.text }} className={`${textSize.xLarge} ${fontFamily.bold}`}>$49.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>one-time</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Subscribe Button */}
        <TouchableOpacity
          onPress={() => { /* TODO: Trigger Google Play purchase */ }}
          disabled={!selectedPlan}
          style={{
            backgroundColor: selectedPlan ? colors.text : colors.border,
            opacity: selectedPlan ? 1 : 0.5,
            borderWidth: 1, borderColor: colors.border, ...shadow.card,
          }}
          className={`${radius.full} py-3.5 items-center mb-3`}
        >
          <Text style={{ color: selectedPlan ? '#000000' : colors.textSecondary }} className={`${textSize.small} ${fontFamily.bold}`}>
            {selectedPlan ? 'Continue' : 'Select a Plan'}
          </Text>
        </TouchableOpacity>

        {/* Terms Text */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-4`}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(MembershipScreen);
