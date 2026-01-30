import React, { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { lightTap } from '../utils/haptics';

// Google Play Store Icon (colored)
const PlayStoreIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 466 511.98">
    <Path fill="#EA4335" fillRule="nonzero" d="M199.9 237.8l-198.5 232.37c7.22,24.57 30.16,41.81 55.8,41.81 11.16,0 20.93,-2.79 29.3,-8.37l0 0 244.16 -139.46 -130.76 -126.35z"/>
    <Path fill="#FBBC04" fillRule="nonzero" d="M433.91 205.1l0 0 -104.65 -60 -111.61 110.22 113.01 108.83 104.64 -58.6c18.14,-9.77 30.7,-29.3 30.7,-50.23 -1.4,-20.93 -13.95,-40.46 -32.09,-50.22z"/>
    <Path fill="#34A853" fillRule="nonzero" d="M199.42 273.45l129.85 -128.35 -241.37 -136.73c-8.37,-5.58 -19.54,-8.37 -30.7,-8.37 -26.5,0 -50.22,18.14 -55.8,41.86 0,0 0,0 0,0l198.02 231.59z"/>
    <Path fill="#4285F4" fillRule="nonzero" d="M1.39 41.86c-1.39,4.18 -1.39,9.77 -1.39,15.34l0 397.64c0,5.57 0,9.76 1.4,15.34l216.27 -214.86 -216.28 -213.46z"/>
  </Svg>
);

interface Props {
  onPurchaseComplete?: () => void;
}

function MembershipScreen({ onPurchaseComplete }: Props) {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime' | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View className="items-center mb-6 mt-4">
          <View className="flex-row items-center mb-3">
            <PlayStoreIcon size={24} />
            <Text style={{ color: colors.text }} className="text-xl font-nunito-bold ml-2">Choose Your Plan</Text>
          </View>
          <Text style={{ color: colors.textSecondary }} className="text-center text-xs font-nunito">
            Your free trial has ended. Subscribe to continue using Scute.
          </Text>
        </View>

        {/* Monthly Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('monthly'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'monthly' ? '#FFFFFF' : 'transparent',
            padding: s(16),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
          }}
          className="rounded-2xl mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-base font-nunito-bold">Monthly</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-1">
                Billed monthly
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className="text-sm font-nunito mr-2">$9.95</Text>
                <Text style={{ color: colors.text }} className="text-xl font-nunito-bold">$6.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Yearly Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('yearly'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'yearly' ? '#FFFFFF' : 'transparent',
            padding: s(16),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
          }}
          className="rounded-2xl mb-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className="text-base font-nunito-bold">Yearly</Text>
                <View style={{ backgroundColor: colors.border }} className="ml-2 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-nunito-bold text-white">Save 29%</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-1">
                $59.40 billed annually
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className="text-sm font-nunito mr-2">$6.95</Text>
                <Text style={{ color: colors.text }} className="text-xl font-nunito-bold">$4.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Lifetime Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('lifetime'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'lifetime' ? '#FFFFFF' : 'transparent',
            padding: s(16),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
          }}
          className="rounded-2xl mb-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className="text-base font-nunito-bold">Lifetime</Text>
                <View style={{ backgroundColor: colors.border }} className="ml-2 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-nunito-bold text-white">Best Value</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito mt-1">
                One-time payment, forever access
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className="text-sm font-nunito mr-2">$79.95</Text>
                <Text style={{ color: colors.text }} className="text-xl font-nunito-bold">$49.95</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-nunito">one-time</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Subscribe Button */}
        <TouchableOpacity
          onPress={() => { lightTap(); /* TODO: Trigger Google Play purchase */ }}
          disabled={!selectedPlan}
          style={{
            backgroundColor: selectedPlan ? '#FFFFFF' : colors.border,
            opacity: selectedPlan ? 1 : 0.5,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
          }}
          className="rounded-full py-3.5 items-center mb-3"
        >
          <Text style={{ color: selectedPlan ? '#000000' : colors.textSecondary }} className="text-sm font-nunito-bold">
            {selectedPlan ? 'Continue' : 'Select a Plan'}
          </Text>
        </TouchableOpacity>

        {/* Terms Text */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-nunito text-center leading-4">
          By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default MembershipScreen;
