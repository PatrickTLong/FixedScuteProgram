import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);
import { useTheme, textSize, fontFamily } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../context/AuthContext';
import { initDefaultPresets, activatePreset, invalidateUserCaches } from '../services/cardApi';
import ScreenTransition from '../components/ScreenTransition';
import type { ScreenTransitionRef } from '../components/ScreenTransition';

const CYCLE_DURATION = 2000; // One hourglass fill (matches 48 frames @ 24fps)
const FADE_DURATION = 80;    // Quick fade between cycles
const TEXT_SWITCH_AT = 2000;  // Switch text after first cycle

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
  } = useAuth();

  const transitionRef = useRef<ScreenTransitionRef>(null);
  const buildOpacity = useRef(new Animated.Value(1)).current;
  const loadOpacity = useRef(new Animated.Value(0)).current;
  const animProgress = useRef(new Animated.Value(0)).current;
  const hourglassOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('[ONBOARDING-LOADING] mounted — choice:', onboardingChoice, '| email:', userEmail);
    const startTime = Date.now();
    let workDone = false;

    const onReady = async () => {
      console.log('[ONBOARDING-LOADING] animating out before transitioning');
      await transitionRef.current?.animateOut('left');
      console.log('[ONBOARDING-LOADING] calling handleOnboardingComplete:', onboardingChoice);
      handleOnboardingComplete(onboardingChoice ?? 'none');
    };

    // Loop: play hourglass → fade out → reset → fade in → repeat
    const runCycle = () => {
      animProgress.setValue(0);
      hourglassOpacity.setValue(1);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: CYCLE_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        if (workDone) {
          onReady();
          return;
        }
        // Fade out, reset, fade back in
        Animated.timing(hourglassOpacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start(() => {
          animProgress.setValue(0);
          Animated.timing(hourglassOpacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }).start(() => {
            runCycle();
          });
        });
      });
    };

    runCycle();

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
            // Invalidate stale cache (has isActive=false) and re-fetch so
            // HomeScreen mounts with correct cached data — no visible flicker
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
      workDone = true;
    };

    doWork();

    return () => {
      clearTimeout(textTimer);
    };
  }, []);

  return (
    <ScreenTransition ref={transitionRef} from="right">
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ opacity: hourglassOpacity }}>
          <AnimatedLottieView
            source={require('../frontassets/Orange colour loading.json')}
            progress={animProgress as any}
            resizeMode="contain"
            style={{ width: s(120), height: s(120) }}
          />
        </Animated.View>
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
