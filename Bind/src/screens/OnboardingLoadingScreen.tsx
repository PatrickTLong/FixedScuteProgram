import React, { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme, textSize, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { initDefaultPresets, activatePreset } from '../services/cardApi';

const MIN_DURATION = 2600;
const TEXT_SWITCH_AT = 1300;
// Speed ramps from 1.0 down to this floor as loading approaches completion
const SPEED_FLOOR = 0.15;

const PRESET_NAME_MAP: Record<string, string> = {
  social_media: 'Social Media',
  xxx: 'XXX Sites',
  both: 'Social Media & XXX Sites',
};

export default function OnboardingLoadingScreen() {
  const { colors } = useTheme();
  const { s } = useResponsive();
  const {
    onboardingChoice,
    userEmail,
    handleOnboardingComplete,
    refreshPresets,
    setSharedPresets,
  } = useAuth();

  const buildOpacity = useRef(new Animated.Value(1)).current;
  const loadOpacity = useRef(new Animated.Value(0)).current;
  const [animSpeed, setAnimSpeed] = useState(1);

  useEffect(() => {
    console.log('[ONBOARDING-LOADING] mounted — choice:', onboardingChoice, '| email:', userEmail);
    const startTime = Date.now();

    // Gradually slow the animation from 1.0 → SPEED_FLOOR over MIN_DURATION
    const speedInterval = setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / MIN_DURATION, 1);
      // Ease-in curve so it slows most noticeably near the end
      const eased = progress * progress;
      setAnimSpeed(1 - eased * (1 - SPEED_FLOOR));
    }, 80);

    // Switch text label halfway through
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(buildOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(loadOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, TEXT_SWITCH_AT);

    const doWork = async () => {
      if (onboardingChoice !== 'none' && userEmail) {
        try {
          console.log('[ONBOARDING-LOADING] calling initDefaultPresets...');
          await initDefaultPresets(userEmail, onboardingChoice!);
          console.log('[ONBOARDING-LOADING] initDefaultPresets complete');

          console.log('[ONBOARDING-LOADING] refreshing presets...');
          const freshPresets = await refreshPresets(true);
          console.log('[ONBOARDING-LOADING] got', freshPresets.length, 'presets:', freshPresets.map(p => p.name));

          const targetName = PRESET_NAME_MAP[onboardingChoice!];
          const matchingPreset = freshPresets.find(p => p.name === targetName);

          if (matchingPreset) {
            console.log('[ONBOARDING-LOADING] activating preset:', matchingPreset.name, '| id:', matchingPreset.id);
            await activatePreset(userEmail, matchingPreset.id);
            console.log('[ONBOARDING-LOADING] activatePreset confirmed by backend');
            setSharedPresets(prev =>
              prev.map(p => (p.id === matchingPreset.id ? { ...p, isActive: true } : p)),
            );
          } else {
            console.warn('[ONBOARDING-LOADING] preset not found:', targetName, '— available:', freshPresets.map(p => p.name));
          }
        } catch (err) {
          console.error('[ONBOARDING-LOADING] error during preset setup:', err);
        }
      } else {
        console.log('[ONBOARDING-LOADING] choice=none — skipping preset creation');
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DURATION - elapsed);
      console.log('[ONBOARDING-LOADING] work done in', elapsed, 'ms — waiting', remaining, 'ms more');

      setTimeout(() => {
        clearInterval(speedInterval);
        console.log('[ONBOARDING-LOADING] calling handleOnboardingComplete:', onboardingChoice);
        handleOnboardingComplete(onboardingChoice ?? 'none');
      }, remaining);
    };

    doWork();

    return () => {
      clearTimeout(textTimer);
      clearInterval(speedInterval);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <LottieView
        source={require('../frontassets/Orange colour loading.json')}
        autoPlay
        loop
        speed={animSpeed}
        resizeMode="contain"
        style={{ width: s(120), height: s(120) }}
      />
      <View style={{ marginTop: s(20), height: s(24), alignItems: 'center' }}>
        <Animated.Text
          style={{ position: 'absolute', opacity: buildOpacity, color: colors.textSecondary }}
          className={`${textSize.small} ${fontFamily.regular}`}
        >
          Building Preset...
        </Animated.Text>
        <Animated.Text
          style={{ position: 'absolute', opacity: loadOpacity, color: colors.textSecondary }}
          className={`${textSize.small} ${fontFamily.regular}`}
        >
          Loading App...
        </Animated.Text>
      </View>
    </View>
  );
}
