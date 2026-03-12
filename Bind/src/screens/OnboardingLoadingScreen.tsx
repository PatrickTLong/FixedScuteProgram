import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);
import { useTheme, textSize, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { initDefaultPresets, activatePreset } from '../services/cardApi';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

// Minimum time the loading screen is shown
const MIN_DURATION = 2600;
const TEXT_SWITCH_AT = 1300;

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
    refreshAll,
    setSharedPresets,
  } = useAuth();

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const buildOpacity = useRef(new Animated.Value(1)).current;
  const loadOpacity = useRef(new Animated.Value(0)).current;
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[ONBOARDING-LOADING] mounted — choice:', onboardingChoice, '| email:', userEmail);
    const startTime = Date.now();
    let workDone = false;
    let animDone = false;

    const onReady = async () => {
      console.log('[ONBOARDING-LOADING] animating out before transitioning');
      await transitionRef.current?.animateOut('left');
      console.log('[ONBOARDING-LOADING] calling handleOnboardingComplete:', onboardingChoice);
      handleOnboardingComplete(onboardingChoice ?? 'none');
    };

    // Animate hourglass from 0→1 over MIN_DURATION
    Animated.timing(animProgress, {
      toValue: 1,
      duration: MIN_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      animDone = true;
      console.log('[ONBOARDING-LOADING] hourglass animation complete');
      if (workDone) onReady();
    });

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

          console.log('[ONBOARDING-LOADING] refreshing all shared state...');
          const { presets: freshPresets } = await refreshAll(true);
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
        console.log('[ONBOARDING-LOADING] choice=none — fetching app state...');
        await refreshAll(true);
      }

      const elapsed = Date.now() - startTime;
      console.log('[ONBOARDING-LOADING] work done in', elapsed, 'ms');
      workDone = true;
      if (animDone) onReady();
    };

    doWork();

    return () => {
      clearTimeout(textTimer);
    };
  }, []);

  return (
    <ScreenTransition ref={transitionRef} from="right">
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedLottieView
          source={require('../frontassets/Orange colour loading.json')}
          progress={animProgress as any}
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
    </ScreenTransition>
  );
}
