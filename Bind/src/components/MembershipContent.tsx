import React, { memo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ImageIcon, CalendarCheckIcon, SquaresFourIcon, HeadsetIcon, RocketLaunchIcon } from 'phosphor-react-native';
import { useTheme, textSize, fontFamily, radius, shadow, buttonPadding, haptics, pill } from '../context/ThemeContext';
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

type Feature =
  | { label: string; type: 'phosphor'; PhosphorIcon: React.ComponentType<any> }
  | { label: string; type: 'svg'; paths: string[]; viewBox: string };

const FEATURES: Feature[] = [
  { label: 'Unlimited presets', type: 'phosphor', PhosphorIcon: SquaresFourIcon },
  { label: 'Unlock Overlay Editor', type: 'phosphor', PhosphorIcon: ImageIcon },
  { label: 'Emergency tapout access', type: 'svg', viewBox: '0 0 640 640', paths: [
    'M273 151.1L288 171.8L303 151.1C328 116.5 368.2 96 410.9 96C484.4 96 544 155.6 544 229.1L544 231.7C544 249.3 540.6 267.3 534.5 285.4C512.7 276.8 488.9 272 464 272C358 272 272 358 272 464C272 492.5 278.2 519.6 289.4 544C288.9 544 288.5 544 288 544C272.5 544 257.2 539.4 244.9 529.9C171.9 474.2 32 343.9 32 231.7L32 229.1C32 155.6 91.6 96 165.1 96C207.8 96 248 116.5 273 151.1zM320 464C320 384.5 384.5 320 464 320C543.5 320 608 384.5 608 464C608 543.5 543.5 608 464 608C384.5 608 320 543.5 320 464zM497.4 387C491.6 382.8 483.6 383 478 387.5L398 451.5C392.7 455.7 390.6 462.9 392.9 469.3C395.2 475.7 401.2 480 408 480L440.9 480L425 522.4C422.5 529.1 424.8 536.7 430.6 541C436.4 545.3 444.4 545 450 540.5L530 476.5C535.3 472.3 537.4 465.1 535.1 458.7C532.8 452.3 526.8 448 520 448L487.1 448L503 405.6C505.5 398.9 503.2 391.3 497.4 387z',
  ]},
  { label: 'Scheduled blocking sessions', type: 'phosphor', PhosphorIcon: CalendarCheckIcon },
  { label: 'Priority support', type: 'phosphor', PhosphorIcon: HeadsetIcon },
  { label: 'All future updates included', type: 'phosphor', PhosphorIcon: RocketLaunchIcon },
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: s(20), paddingTop: s(24), paddingBottom: s(12) }} showsVerticalScrollIndicator={false} bounces={false}>
      {/* Top Section */}
      <View>
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
                {feature.type === 'phosphor' ? (
                  <feature.PhosphorIcon size={s(22)} color={colors.text} weight="fill" />
                ) : (
                  <Svg width={s(22)} height={s(22)} viewBox={feature.viewBox} fill={colors.text}>
                    {feature.paths.map((d: string, i: number) => <Path key={i} d={d} />)}
                  </Svg>
                )}
                <Text style={{ color: colors.text, marginLeft: s(12) }} className={`${textSize.extraSmall} ${fontFamily.regular}`}>
                  {feature.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Bottom Section */}
      <View style={{ marginTop: s(32) }}>
        {/* Subscribe Button */}
        <Animated.View style={{ transform: [{ scale: btnPulse }], marginBottom: s(12) }}>
          <TouchableOpacity
            onPress={() => { /* TODO: Google Play purchase */ }}
            activeOpacity={0.8}
            style={{ backgroundColor: colors.text, ...shadow.card }}
            className={`${radius.full} ${pill} items-center justify-center`}
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
    </ScrollView>
  );
}

export default memo(MembershipContent);
