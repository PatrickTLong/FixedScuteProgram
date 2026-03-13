import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';
import { useTheme, textSize, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { initDefaultPresets, activatePreset, invalidateUserCaches } from '../services/cardApi';

const TEXT_SWITCH_AT = 2000;

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
    refreshAll,
    handleOnboardingLoadingComplete,
  } = useAuth();
  const buildOpacity = useRef(new Animated.Value(1)).current;
  const loadOpacity = useRef(new Animated.Value(0)).current;
  const transitionRef = useRef<ScreenTransitionRef>(null);

  const isNone = onboardingChoice === 'none';

  useEffect(() => {
    console.log('[ONBOARDING-LOADING] mounted — choice:', onboardingChoice, '| email:', userEmail);
    const startTime = Date.now();

    const onReady = async () => {
      console.log('[ONBOARDING-LOADING] transitioning to main');
      await transitionRef.current?.animateOut('left');
      handleOnboardingLoadingComplete();
    };

    // Switch text label after first cycle
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

          console.log('[ONBOARDING-LOADING] refreshing all shared state...');
          const { presets: freshPresets } = await refreshAll(true);
          console.log('[ONBOARDING-LOADING] got', freshPresets.length, 'presets:', freshPresets.map(p => p.name));

          const targetName = PRESET_NAME_MAP[onboardingChoice!];
          const matchingPreset = freshPresets.find(p => p.name === targetName);

          if (matchingPreset) {
            console.log('[ONBOARDING-LOADING] activating preset:', matchingPreset.name, '| id:', matchingPreset.id);
            await activatePreset(userEmail, matchingPreset.id);
            console.log('[ONBOARDING-LOADING] activatePreset confirmed by backend');
            invalidateUserCaches(userEmail);
            await refreshAll(true);
            console.log('[ONBOARDING-LOADING] final refreshAll complete — cache up-to-date');
          } else {
            console.warn('[ONBOARDING-LOADING] preset not found:', targetName, '— available:', freshPresets.map(p => p.name));
          }
        } catch (err) {
          console.error('[ONBOARDING-LOADING] error during preset setup:', err);
        }
      } else {
        console.log('[ONBOARDING-LOADING] choice=none — fetching app state...');
        await refreshAll(true);
      }

      const elapsed = Date.now() - startTime;
      console.log('[ONBOARDING-LOADING] work done in', elapsed, 'ms');
      onReady();
    };

    doWork();

    return () => {
      clearTimeout(textTimer);
    };
  }, []);

  return (
    <ScreenTransition ref={transitionRef}>
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <LottieView
          source={require('../frontassets/blue loading.json')}
          autoPlay
          loop
          resizeMode="contain"
          style={{ width: s(120), height: s(120) }}
        />
        <View style={{ marginTop: s(-10), height: s(24), alignItems: 'center' }}>
          <Animated.Text
            style={{ position: 'absolute', opacity: buildOpacity, color: colors.textSecondary }}
            className={`${textSize.small} ${fontFamily.regular}`}
          >
            {isNone ? 'Setting Up...' : 'Building Preset...'}
          </Animated.Text>
          <Animated.Text
            style={{ position: 'absolute', opacity: loadOpacity, color: colors.textSecondary }}
            className={`${textSize.small} ${fontFamily.regular}`}
          >
            Loading App...
          </Animated.Text>
        </View>
      </View>
    </ScreenTransition>
  );
}
