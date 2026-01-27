import React, { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';

interface Props {
  onPurchaseComplete?: () => void;
}

function MembershipScreen({ onPurchaseComplete }: Props) {
  const { colors } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime' | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View className="items-center mb-8 mt-4">
          <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold mb-2">Choose Your Plan</Text>
          <Text style={{ color: colors.textSecondary }} className="text-center text-sm font-nunito">
            Your free trial has ended. Subscribe to continue using Scute.
          </Text>
        </View>

        {/* Monthly Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('monthly'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'monthly' ? '#FFFFFF' : colors.border,
          }}
          className="rounded-2xl p-4 mb-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="text-lg font-nunito-bold">Monthly</Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mt-1">
                Billed monthly
              </Text>
            </View>
            <View className="items-end">
              <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold">$6.95</Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Yearly Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('yearly'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'yearly' ? '#FFFFFF' : colors.border,
          }}
          className="rounded-2xl p-4 mb-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className="text-lg font-nunito-bold">Yearly</Text>
                <View style={{ backgroundColor: '#4CAF50' }} className="ml-2 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-nunito-bold text-white">SAVE 29%</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mt-1">
                $59.40 billed annually
              </Text>
            </View>
            <View className="items-end">
              <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold">$4.95</Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">/month</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Lifetime Plan */}
        <TouchableOpacity
          onPress={() => { lightTap(); setSelectedPlan('lifetime'); }}
          style={{
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: selectedPlan === 'lifetime' ? '#FFFFFF' : colors.border,
          }}
          className="rounded-2xl p-4 mb-8"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className="text-lg font-nunito-bold">Lifetime</Text>
                <View style={{ backgroundColor: '#FFD700' }} className="ml-2 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-nunito-bold text-black">BEST VALUE</Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito mt-1">
                One-time payment, forever access
              </Text>
            </View>
            <View className="items-end">
              <Text style={{ color: colors.text }} className="text-2xl font-nunito-bold">$49.95</Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-nunito">one-time</Text>
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
          }}
          className="rounded-full py-4 items-center mb-4"
        >
          <Text style={{ color: selectedPlan ? '#000000' : colors.textSecondary }} className="text-base font-nunito-bold">
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
