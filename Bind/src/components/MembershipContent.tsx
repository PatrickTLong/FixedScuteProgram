import React, { memo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme, textSize, fontFamily, radius, shadow, buttonPadding } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLANS = {
  monthly: {
    label: 'Monthly',
    price: '$6.95',
    period: '/month',
    originalPrice: '$9.95',
    billingNote: 'Billed monthly',
    savingsBadge: null,
  },
  yearly: {
    label: 'Yearly',
    price: '$4.95',
    period: '/month',
    originalPrice: '$6.95',
    billingNote: '$59.40 billed annually',
    savingsBadge: 'Save 29%',
  },
  lifetime: {
    label: 'Lifetime',
    price: '$49.95',
    period: 'one-time',
    originalPrice: '$79.95',
    billingNote: 'One-time payment, forever access',
    savingsBadge: 'Best Value',
  },
} as const;

type PlanKey = keyof typeof PLANS;
const PLAN_KEYS: PlanKey[] = ['monthly', 'yearly', 'lifetime'];

const FEATURES = [
  'Unlimited presets',
  'Emergency tapout access',
  'Scheduled blocking sessions',
  'Priority support',
  'All future updates included',
];

function MembershipContent() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('yearly');
  const priceScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.stagger(80, featureAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, friction: 8, useNativeDriver: true })
      )),
    ]).start();
  }, []);

  const handlePlanChange = (plan: PlanKey) => {
    if (plan === selectedPlan) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPlan(plan);
    priceScale.setValue(0.92);
    Animated.spring(priceScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  };

  const plan = PLANS[selectedPlan];

  return (
    <View style={{ flex: 1, paddingHorizontal: s(20), paddingVertical: s(24), justifyContent: 'space-between' }}>
      {/* Top Section */}
      <View style={{ flex: 1 }}>
        {/* Tab Selector */}
        <View style={{ backgroundColor: colors.card, borderRadius: s(50), borderWidth: 1, borderColor: colors.border, padding: s(4), flexDirection: 'row', ...shadow.card, marginBottom: s(24) }}>
          {PLAN_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => handlePlanChange(key)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                backgroundColor: selectedPlan === key ? colors.text : 'transparent',
                borderRadius: s(50),
                paddingVertical: s(10),
                alignItems: 'center',
              }}
            >
              <Text style={{ color: selectedPlan === key ? colors.bg : colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.bold}`}>
                {PLANS[key].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Display */}
        <Animated.View style={{ alignItems: 'center', marginBottom: s(24), opacity: contentOpacity, transform: [{ scale: priceScale }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {selectedPlan === 'lifetime' ? (
              <Svg width={s(28)} height={s(28)} viewBox="0 -960 960 960">
                <Defs>
                  <SvgGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#F59E0B" />
                    <Stop offset="0.5" stopColor="#FBBF24" />
                    <Stop offset="1" stopColor="#D97706" />
                  </SvgGradient>
                </Defs>
                <Path fill="url(#crownGrad)" d="M200-160v-80h560v80H200Zm0-140-51-321q-2 0-4.5.5t-4.5.5q-25 0-42.5-17.5T80-680q0-25 17.5-42.5T140-740q25 0 42.5 17.5T200-680q0 7-1.5 13t-3.5 11l125 56 125-171q-11-8-18-21t-7-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820q0 15-7 28t-18 21l125 171 125-56q-2-5-3.5-11t-1.5-13q0-25 17.5-42.5T820-740q25 0 42.5 17.5T880-680q0 25-17.5 42.5T820-620q-2 0-4.5-.5t-4.5-.5l-51 321H200Z" />
              </Svg>
            ) : selectedPlan === 'yearly' ? (
              <Svg width={s(28)} height={s(28)} viewBox="0 -960 960 960">
                <Defs>
                  <SvgGradient id="icyDiamondGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#67E8F9" />
                    <Stop offset="0.5" stopColor="#A5F3FC" />
                    <Stop offset="1" stopColor="#22D3EE" />
                  </SvgGradient>
                </Defs>
                <Path fill="url(#icyDiamondGrad)" d="m368-630 106-210h12l106 210H368Zm82 474L105-570h345v414Zm60 0v-414h345L510-156Zm148-474L554-840h206l105 210H658Zm-563 0 105-210h206L302-630H95Z" />
              </Svg>
            ) : (
              <Svg width={s(28)} height={s(28)} viewBox="0 -960 960 960">
                <Defs>
                  <SvgGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#7B6FE8" />
                    <Stop offset="0.5" stopColor="#A78BFA" />
                    <Stop offset="1" stopColor="#6366F1" />
                  </SvgGradient>
                </Defs>
                <Path fill="url(#diamondGrad)" d="m183-680-85-85 57-56 85 85-57 56Zm257-80v-120h80v120h-80Zm335 80-57-57 85-85 57 57-85 85ZM480-80 157-400h646L480-80ZM320-680h320l164 200H156l164-200Z" />
              </Svg>
            )}
            <Text style={{ color: colors.text, marginLeft: s(6) }} className={`${textSize['4xLarge']} ${fontFamily.bold}`}>{plan.price}</Text>
            <Text style={{ color: colors.textSecondary, marginLeft: s(4) }} className={`${textSize.base} ${fontFamily.regular}`}>{plan.period}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s(4) }}>
            {plan.originalPrice && (
              <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular}`}>
                {plan.originalPrice}
              </Text>
            )}
            {plan.savingsBadge && (
              <View style={{ backgroundColor: colors.green, borderRadius: s(50), paddingHorizontal: s(10), paddingVertical: s(2), marginLeft: s(8), ...shadow.card }}>
                <Text style={{ color: colors.text }} className={`${textSize.extraSmall} ${fontFamily.bold}`}>{plan.savingsBadge}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.textSecondary, marginTop: s(6) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
            {plan.billingNote}
          </Text>
        </Animated.View>

        {/* Features Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card, overflow: 'hidden' }} className={radius['2xl']}>
          {FEATURES.map((feature, index) => {
            const isLast = index === FEATURES.length - 1;
            return (
              <Animated.View
                key={feature}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: s(16),
                  paddingVertical: s(buttonPadding.standard),
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.divider,
                  opacity: featureAnims[index],
                  transform: [{ translateY: featureAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                }}
              >
                <View style={{ width: s(22), height: s(22), borderRadius: s(11), backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={s(12)} height={s(12)} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={{ color: colors.text, marginLeft: s(12) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  {feature}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Bottom Section */}
      <View>
        {/* Subscribe Button */}
        <TouchableOpacity
          onPress={() => { /* TODO: Google Play purchase */ }}
          activeOpacity={0.8}
          style={{ backgroundColor: colors.text, ...shadow.card }}
          className={`${radius.full} py-4 items-center mb-3`}
        >
          <Text style={{ color: colors.bg }} className={`${textSize.small} ${fontFamily.bold}`}>
            {selectedPlan === 'lifetime' ? 'Purchase Lifetime' : 'Subscribe'}
          </Text>
        </TouchableOpacity>

        {/* Restore Subscription */}
        <TouchableOpacity activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: s(4), marginBottom: s(4) }}>
          <Text style={{ color: colors.textSecondary }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
            Restore Subscription
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={{ color: colors.textMuted }} className={`${textSize.extraSmall} ${fontFamily.regular} text-center leading-4`}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless cancelled.
        </Text>
      </View>
    </View>
  );
}

export default memo(MembershipContent);
