import React, { memo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme, textSize, fontFamily, radius, shadow, buttonPadding, haptics } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
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

const FEATURES: { label: string; icon: string }[] = [
  { label: 'Unlimited presets', icon: 'all-inclusive' },
  { label: 'Emergency tapout access', icon: 'emergency' },
  { label: 'Scheduled blocking sessions', icon: 'perm-contact-calendar' },
  { label: 'Priority support', icon: 'support-agent' },
  { label: 'All future updates included', icon: 'system-update' },
];

const SEAL_ONLY_PATH = "M480-80q-24 0-46-9t-39-26q-29-29-50-38t-63-9q-50 0-85-35t-35-85q0-42-9-63t-38-50q-17-17-26-39t-9-46q0-24 9-46t26-39q29-29 38-50t9-63q0-50 35-85t85-35q42 0 63-9t50-38q17-17 39-26t46-9q24 0 46 9t39 26q29 29 50 38t63 9q50 0 85 35t35 85q0 42 9 63t38 50q17 17 26 39t9 46q0 24-9 46t-26 39q-29 29-38 50t-9 63q0 50-35 85t-85 35q-42 0-63 9t-50 38q-17 17-39 26t-46 9Z";
const PERCENT_ICON_PATH = "M580-320q25 0 42.5-17.5T640-380q0-25-17.5-42.5T580-440q-25 0-42.5 17.5T520-380q0 25 17.5 42.5T580-320Zm-202-2 260-260-56-56-260 260 56 56Zm44.5-215.5Q440-555 440-580t-17.5-42.5Q405-640 380-640t-42.5 17.5Q320-605 320-580t17.5 42.5Q355-520 380-520t42.5-17.5Z";

const SpinningDiscountSeal = memo(({ size, sealColor }: { size: number; sealColor: string }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [spinAnim, popAnim, pulseAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: size, height: size, transform: [{ scale: popAnim }, { scale: pulseAnim }] }}>
        <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: spin }] }}>
          <Svg width={size} height={size} viewBox="0 -960 960 960">
            <Path d={SEAL_ONLY_PATH} fill={sealColor} />
          </Svg>
        </Animated.View>
        <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size * 0.55} height={size * 0.55} viewBox="240 -720 480 480">
            <Path d={PERCENT_ICON_PATH} fill="#FFFFFF" />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
});

const GlintBadge = memo(({ label, bgColor, textColor, s }: { label: string; bgColor: string; textColor: string; s: (size: number) => number }) => {
  const glintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(glintAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glintAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glintAnim]);

  const glintTranslate = glintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-s(40), s(80)],
  });

  const glintOpacity = glintAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 0.5, 0.5, 0],
  });

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: s(50), paddingHorizontal: s(10), paddingVertical: s(2), marginLeft: s(8), ...shadow.card, overflow: 'hidden' }}>
      <Text style={{ color: textColor }} className={`${textSize.extraSmall} ${fontFamily.bold}`}>{label}</Text>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: s(14),
          transform: [{ translateX: glintTranslate }, { rotate: '20deg' }],
          opacity: glintOpacity,
          backgroundColor: 'rgba(255,255,255,0.4)',
        }}
      />
    </View>
  );
});

function MembershipContent() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('yearly');
  const priceScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.stagger(80, featureAnims.map(anim =>
        Animated.spring(anim, { toValue: 1, friction: 8, useNativeDriver: true })
      )),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.03, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePlanChange = (plan: PlanKey) => {
    if (plan === selectedPlan) return;
    if (haptics.planTab.enabled) triggerHaptic(haptics.planTab.type);
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
        <Animated.View style={{ alignItems: 'center', marginBottom: s(12), height: s(110), justifyContent: 'center',opacity: contentOpacity, transform: [{ scale: priceScale }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SpinningDiscountSeal size={s(28)} sealColor={colors.red} />
            <Text style={{ color: colors.text, marginLeft: s(6) }} className={`${textSize['4xLarge']} ${fontFamily.bold}`}>{plan.price}</Text>
            <Text style={{ color: colors.textSecondary, marginLeft: s(4) }} className={`${textSize.base} ${fontFamily.regular}`}>{plan.period}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: s(4) }}>
            <Text style={{ color: plan.originalPrice ? colors.textMuted : 'transparent', textDecorationLine: 'line-through' }} className={`${textSize.small} ${fontFamily.regular}`}>
              {plan.originalPrice || '$0.00'}
            </Text>
            {plan.savingsBadge && (
              <GlintBadge label={plan.savingsBadge} bgColor={colors.green} textColor={colors.text} s={s} />
            )}
          </View>
          <Text style={{ color: colors.textSecondary, marginTop: s(6) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
            {plan.billingNote}, Cancel anytime
          </Text>
        </Animated.View>

        {/* Features Card */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow.card, overflow: 'hidden' }} className={radius['2xl']}>
          {FEATURES.map((feature, index) => {
            const isLast = index === FEATURES.length - 1;
            return (
              <Animated.View
                key={feature.label}
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
                <MaterialIcons name={feature.icon} size={s(22)} color={colors.text} />
                <Text style={{ color: colors.text, marginLeft: s(12) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  {feature.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Bottom Section */}
      <View>
        {/* Subscribe Button */}
        <Animated.View style={{ transform: [{ scale: btnPulse }], marginBottom: s(12) }}>
          <TouchableOpacity
            onPress={() => { /* TODO: Google Play purchase */ }}
            activeOpacity={0.8}
            style={{ backgroundColor: colors.text, ...shadow.card }}
            className={`${radius.full} py-4 items-center`}
          >
            <Text style={{ color: colors.bg }} className={`${textSize.small} ${fontFamily.bold}`}>
              {selectedPlan === 'lifetime' ? 'Purchase Lifetime' : 'Subscribe'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

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
