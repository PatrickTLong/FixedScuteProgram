import React, { memo, useCallback, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Line, G } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);

import BoxiconsFilled from './BoxiconsFilled';
import BoxiconsRegular from './BoxiconsRegular';
import { useTheme , textSize, fontFamily, shadow, iconSize, buttonPadding, haptics } from '../context/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { triggerHaptic } from '../utils/haptics';
import type { BottomTabBarProps as RNBottomTabBarProps } from '@react-navigation/bottom-tabs';

type TabName = 'home' | 'presets' | 'overlays' | 'stats' | 'settings';

interface TabItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  renderIcon: (color: string, filled: boolean, iconRef?: React.RefObject<AnimatedStatsIconRef | AnimatedPresetsIconRef | AnimatedOverlaysIconRef | null>) => React.ReactNode;
  activeColor: string;
  inactiveColor: string;
  isSettings?: boolean;
  isStats?: boolean;
  isPresets?: boolean;
  isOverlays?: boolean;
}

const HomeHeartIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  filled
    ? <BoxiconsFilled name="bx-home-heart" size={iconSize.lg} color={color} />
    : <BoxiconsRegular name="bx-home-heart" size={iconSize.lg} color={color} />
);

const PresetsIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    {filled ? (
      <>
        <Path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
        <Path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
        <Path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
        <Path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
      </>
    ) : (
      <Path
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// Animated PresetsIcon with discs that stack
export interface AnimatedPresetsIconRef {
  animate: () => void;
}

export const AnimatedPresetsIcon = forwardRef<AnimatedPresetsIconRef, { color: string; filled?: boolean }>(
  ({ color, filled }, ref) => {
    // Each disc animates Y position and opacity
    const disc1Anim = useRef(new Animated.Value(1)).current;
    const disc2Anim = useRef(new Animated.Value(1)).current;
    const disc3Anim = useRef(new Animated.Value(1)).current;
    const disc4Anim = useRef(new Animated.Value(1)).current;

    const animate = useCallback(() => {
      // Reset all discs
      disc1Anim.setValue(0);
      disc2Anim.setValue(0);
      disc3Anim.setValue(0);
      disc4Anim.setValue(0);

      // Staggered animation - each disc animates one by one from bottom to top
      Animated.stagger(60, [
        Animated.timing(disc4Anim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(disc3Anim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(disc2Anim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(disc1Anim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
      ]).start();
    }, [disc1Anim, disc2Anim, disc3Anim, disc4Anim]);

    useImperativeHandle(ref, () => ({ animate }), [animate]);

    // Auto-animate when filled changes to true (tab switch case)
    const prevFilledRef = useRef(filled);
    useEffect(() => {
      if (filled && !prevFilledRef.current) {
        animate();
      }
      prevFilledRef.current = filled;
    }, [filled, animate]);

    // Interpolate Y translations - all discs rise from below
    const disc1Y = disc1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [6, 0],
    });
    const disc2Y = disc2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [4, 0],
    });
    const disc3Y = disc3Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 0],
    });
    const disc4Y = disc4Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0],
    });

    return (
      <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
        {filled ? (
          <>
            <AnimatedG y={disc1Y} opacity={disc1Anim}>
              <Path
                d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z"
                fill={color}
              />
            </AnimatedG>
            <AnimatedG y={disc2Y} opacity={disc2Anim}>
              <Path
                d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z"
                fill={color}
              />
            </AnimatedG>
            <AnimatedG y={disc3Y} opacity={disc3Anim}>
              <Path
                d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z"
                fill={color}
              />
            </AnimatedG>
            <AnimatedG y={disc4Y} opacity={disc4Anim}>
              <Path
                d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z"
                fill={color}
              />
            </AnimatedG>
          </>
        ) : (
          <Path
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    );
  }
);

// Static StatsIcon for non-animated use
const StatsIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    {filled ? (
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75A.75.75 0 0 1 13.5 9Zm3.75-1.5a.75.75 0 0 0-1.5 0v9a.75.75 0 0 0 1.5 0v-9Z"
      />
    ) : (
      <Path
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

// Animated StatsIcon with bars that build up
export interface AnimatedStatsIconRef {
  animate: () => void;
}

export const AnimatedStatsIcon = forwardRef<AnimatedStatsIconRef, { color: string; filled?: boolean; barColor?: string }>(
  ({ color, filled, barColor }, ref) => {
    // Bar heights: bar1=2.25, bar2=4.5, bar3=6.75, bar4=9 (in viewBox units)
    const bar1Anim = useRef(new Animated.Value(1)).current;
    const bar2Anim = useRef(new Animated.Value(1)).current;
    const bar3Anim = useRef(new Animated.Value(1)).current;
    const bar4Anim = useRef(new Animated.Value(1)).current;

    const animate = useCallback(() => {
      // Reset all bars to 0
      bar1Anim.setValue(0);
      bar2Anim.setValue(0);
      bar3Anim.setValue(0);
      bar4Anim.setValue(0);

      // Staggered animation - bars build up one after another
      Animated.stagger(60, [
        Animated.timing(bar1Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(bar2Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(bar3Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(bar4Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
      ]).start();
    }, [bar1Anim, bar2Anim, bar3Anim, bar4Anim]);

    useImperativeHandle(ref, () => ({ animate }), [animate]);

    // Auto-animate when filled changes to true (tab switch case)
    const prevFilledRef = useRef(filled);
    useEffect(() => {
      if (filled && !prevFilledRef.current) {
        animate();
      }
      prevFilledRef.current = filled;
    }, [filled, animate]);

    // Interpolate bar heights (y1 is top, y2 is bottom at 16.5)
    const bar1Y1 = bar1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16.5, 14.25], // height 2.25
    });
    const bar2Y1 = bar2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16.5, 12], // height 4.5
    });
    const bar3Y1 = bar3Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16.5, 9.75], // height 6.75
    });
    const bar4Y1 = bar4Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [16.5, 7.5], // height 9
    });

    return (
      <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24">
        {/* Background rectangle */}
        <Rect
          x={3}
          y={3}
          width={18}
          height={18}
          rx={3}
          stroke={filled ? "none" : color}
          strokeWidth={filled ? 0 : 1.5}
          fill={filled ? color : "none"}
        />
        {/* Bar 1 - shortest */}
        <AnimatedLine
          x1={7.5}
          y1={bar1Y1}
          x2={7.5}
          y2={16.5}
          stroke={filled && barColor ? barColor : color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Bar 2 */}
        <AnimatedLine
          x1={10.5}
          y1={bar2Y1}
          x2={10.5}
          y2={16.5}
          stroke={filled && barColor ? barColor : color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Bar 3 */}
        <AnimatedLine
          x1={13.5}
          y1={bar3Y1}
          x2={13.5}
          y2={16.5}
          stroke={filled && barColor ? barColor : color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Bar 4 - tallest */}
        <AnimatedLine
          x1={16.5}
          y1={bar4Y1}
          x2={16.5}
          y2={16.5}
          stroke={filled && barColor ? barColor : color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Overlays tab icon — paint palette (Heroicons)
const OverlaysIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  filled
    ? <BoxiconsFilled name="bx-brush-sparkles" size={iconSize.lg} color={color} />
    : <BoxiconsRegular name="bx-brush-sparkles" size={iconSize.lg} color={color} />
);

// Animated OverlaysIcon with sparkles that appear one by one
export interface AnimatedOverlaysIconRef {
  animate: () => void;
}

export const AnimatedOverlaysIcon = forwardRef<AnimatedOverlaysIconRef, { color: string; filled?: boolean }>(
  ({ color, filled }, ref) => {
    // Each sparkle animates opacity
    const sparkle1Anim = useRef(new Animated.Value(1)).current;
    const sparkle2Anim = useRef(new Animated.Value(1)).current;

    const animate = useCallback(() => {
      // Reset sparkles to hidden
      sparkle1Anim.setValue(0);
      sparkle2Anim.setValue(0);

      // Staggered animation - sparkles appear one by one
      Animated.stagger(120, [
        Animated.timing(sparkle1Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
        Animated.timing(sparkle2Anim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
      ]).start();
    }, [sparkle1Anim, sparkle2Anim]);

    useImperativeHandle(ref, () => ({ animate }), [animate]);

    // Auto-animate when filled changes to true (tab switch case)
    const prevFilledRef = useRef(filled);
    useEffect(() => {
      if (filled && !prevFilledRef.current) {
        animate();
      }
      prevFilledRef.current = filled;
    }, [filled, animate]);

    // Interpolate scale for sparkles (pop-in effect)
    const sparkle1Scale = sparkle1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });
    const sparkle2Scale = sparkle2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    if (!filled) {
      // Outline mode — use font icon (no animation needed for outline)
      return <BoxiconsRegular name="bx-brush-sparkles" size={iconSize.lg} color={color} />;
    }

    return (
      <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill={color}>
        {/* Paint blob - static */}
        <Path d="m10.05,12.18c-1.27-.64-2.99-.54-4.26.25-1.17.72-1.81,1.89-1.81,3.29,0,.3.02.59.04.86.08,1.03.11,1.42-1.47,2.21-.32.16-.53.47-.55.82s.14.69.43.89c1,.69,2.76,1.49,4.62,1.49,1.35,0,2.74-.42,3.92-1.6,1.2-1.2,1.8-3.1,1.52-4.84-.24-1.5-1.11-2.7-2.44-3.36Z" />
        {/* Brush diagonal - static */}
        <Path d="m21.08,2.91c-1.22-1.22-3.2-1.22-4.41,0l-7.88,7.88c.61.07,1.19.23,1.71.49,1.51.76,2.52,2.08,2.89,3.73l7.69-7.69c1.22-1.22,1.22-3.2,0-4.41Z" />
        {/* Sparkle 1 (upper-left) - animated */}
        <AnimatedG opacity={sparkle1Anim} scale={sparkle1Scale} origin="6, 6">
          <Path d="m2.32,6.49l2.21.98.98,2.21c.09.19.28.32.49.32s.4-.12.49-.32l.98-2.21,2.21-.98c.19-.09.32-.28.32-.49s-.12-.4-.32-.49l-2.21-.98-.98-2.21c-.08-.19-.27-.32-.48-.32-.21-.02-.4.12-.49.31l-.99,2.14-2.23,1.07c-.19.09-.3.28-.3.49s.13.39.32.48Z" />
        </AnimatedG>
        {/* Sparkle 2 (lower-right) - animated */}
        <AnimatedG opacity={sparkle2Anim} scale={sparkle2Scale} origin="20, 19">
          <Path d="m21.76,18.63l-1.66-.74-.74-1.66c-.06-.14-.21-.24-.36-.24-.16-.01-.3.09-.37.23l-.74,1.6-1.67.8c-.14.07-.23.21-.23.37,0,.16.1.3.24.36l1.66.74.74,1.66c.06.14.21.24.37.24s.3-.09.37-.24l.74-1.66,1.66-.74c.14-.06.24-.21.24-.37s-.09-.3-.24-.37Z" />
        </AnimatedG>
      </Svg>
    );
  }
);

const FLASH_SIZE = 80;

const TabItem = memo(({ label, isActive, onPress, renderIcon, activeColor, inactiveColor, isSettings = false, isStats = false, isPresets = false, isOverlays = false }: TabItemProps) => {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;
  const statsIconRef = useRef<AnimatedStatsIconRef>(null);
  const presetsIconRef = useRef<AnimatedPresetsIconRef>(null);
  const overlaysIconRef = useRef<AnimatedOverlaysIconRef>(null);
  const [pressed, setPressed] = useState(false);

  // Auto-animate gear rotation when settings tab becomes active (same pattern as other icons)
  const prevActiveRef = useRef(isActive);
  const triggerGearTorque = useCallback(() => {
    iconRotation.setValue(0);
    Animated.sequence([
      Animated.timing(iconRotation, {
        toValue: 0.85,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(iconRotation, {
        toValue: 1.12,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(iconRotation, {
        toValue: 0.95,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [iconRotation]);

  useEffect(() => {
    if (isSettings && isActive && !prevActiveRef.current) {
      triggerGearTorque();
    }
    prevActiveRef.current = isActive;
  }, [isActive, isSettings, triggerGearTorque]);

  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const triggerFlash = useCallback(() => {
    if (flashAnimRef.current) flashAnimRef.current.stop();
    // Show flash + scale while finger is held down
    flashOpacity.setValue(0.15);
    iconScale.setValue(1.2);

    // Gear rotation for settings tab
    if (isSettings) {
      triggerGearTorque();
    }

    // Stats bars animation - only on re-tap (tab switch handled by filled-change detection)
    if (isStats && statsIconRef.current && isActive) {
      statsIconRef.current.animate();
    }

    // Presets discs animation - only on re-tap (tab switch handled by filled-change detection)
    if (isPresets && presetsIconRef.current && isActive) {
      presetsIconRef.current.animate();
    }

    // Overlays sparkles animation - only on re-tap (tab switch handled by filled-change detection)
    if (isOverlays && overlaysIconRef.current && isActive) {
      overlaysIconRef.current.animate();
    }

  }, [flashOpacity, iconScale, triggerGearTorque, isSettings, isStats, isPresets, isOverlays, isActive]);

  const handlePressOut = useCallback(() => {
    // Release: animate flash + scale back
    flashAnimRef.current = Animated.parallel([
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]);
    flashAnimRef.current.start();
  }, [flashOpacity, iconScale]);

  const displayColor = isActive ? activeColor : inactiveColor;

  const rotateInterpolate = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '120deg'],
  });

  return (
    <TouchableOpacity
      onPressIn={() => {
        triggerFlash();
        if (haptics.tabBar.enabled) triggerHaptic(haptics.tabBar.type);
      }}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ paddingVertical: buttonPadding.tabItem }}
      className="flex-1 items-center justify-center"
    >
      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.flash,
            { opacity: flashOpacity },
          ]}
        />
        <Animated.View style={{
          transform: [
            { scale: iconScale },
            { rotate: isSettings ? rotateInterpolate : '0deg' },
          ]
        }}>
          {renderIcon(displayColor, isActive, isStats ? statsIconRef : isPresets ? presetsIconRef : isOverlays ? overlaysIconRef : undefined)}
        </Animated.View>
        <Text
          style={{ color: displayColor }}
          className={`${textSize.extraSmall} mt-1 ${fontFamily.regular}`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    width: FLASH_SIZE,
    height: FLASH_SIZE,
    borderRadius: FLASH_SIZE / 2,
    backgroundColor: '#ffffff',
  },
});

// Route names for hidden preset editing tabs
const HIDDEN_ROUTES = ['EditPresetApps', 'PresetSettings', 'OverlayEditor', 'DatePicker'];

function BottomTabBar({ state, navigation }: RNBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { s } = useResponsive();

  const currentRouteName = state.routes[state.index]?.name || 'Home';

  // Map current route to which visible tab is active
  const activeTab: TabName = (currentRouteName.toLowerCase() as TabName) || 'home';

  const handleTabPress = useCallback((tab: TabName) => {
    const routeNameMap: Record<TabName, string> = {
      home: 'Home',
      presets: 'Presets',
      overlays: 'Overlays',
      stats: 'Stats',
      settings: 'Settings',
    };
    const routeName = routeNameMap[tab];
    if (routeName) {
      navigation.navigate(routeName);
    }
  }, [navigation]);

  const handleHomePress = useCallback(() => handleTabPress('home'), [handleTabPress]);
  const handlePresetsPress = useCallback(() => handleTabPress('presets'), [handleTabPress]);
  const handleOverlaysPress = useCallback(() => handleTabPress('overlays'), [handleTabPress]);
  const handleStatsPress = useCallback(() => handleTabPress('stats'), [handleTabPress]);
  const handleSettingsPress = useCallback(() => handleTabPress('settings'), [handleTabPress]);

  const bottomPadding = Math.max(insets.bottom, s(24));

  const renderHomeIcon = useCallback((color: string, filled: boolean) =>
    <HomeHeartIcon color={color} filled={filled} />, []);
  const renderPresetsIcon = useCallback((color: string, filled: boolean, iconRef?: React.RefObject<AnimatedPresetsIconRef | null>) =>
    iconRef ? <AnimatedPresetsIcon ref={iconRef} color={color} filled={filled} /> : <PresetsIcon color={color} filled={filled} />, []);
  const renderStatsIcon = useCallback((color: string, filled: boolean, iconRef?: React.RefObject<AnimatedStatsIconRef | null>) =>
    iconRef ? <AnimatedStatsIcon ref={iconRef} color={color} filled={filled} barColor={colors.bg} /> : <StatsIcon color={color} filled={filled} />, [colors.bg]);
  const renderOverlaysIcon = useCallback((color: string, filled: boolean, iconRef?: React.RefObject<AnimatedOverlaysIconRef | null>) =>
    iconRef ? <AnimatedOverlaysIcon ref={iconRef} color={color} filled={filled} /> : <OverlaysIcon color={color} filled={filled} />, []);
  const renderSettingsIcon = useCallback((color: string) => <SettingsIcon color={color} />, []);

  // Hide tab bar on preset editing screens
  if (HIDDEN_ROUTES.includes(currentRouteName)) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: bottomPadding,
        borderTopWidth: 1, borderTopColor: colors.border,
        ...shadow.tabBar,
      }}
    >
      <View style={{ overflow: 'hidden' }} className="flex-row pt-2">
        <TabItem
          label="Home"
          isActive={activeTab === 'home'}
          onPress={handleHomePress}
          renderIcon={renderHomeIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
        />
        <TabItem
          label="Presets"
          isActive={activeTab === 'presets'}
          onPress={handlePresetsPress}
          renderIcon={renderPresetsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
          isPresets
        />
        <TabItem
          label="Overlays"
          isActive={activeTab === 'overlays'}
          onPress={handleOverlaysPress}
          renderIcon={renderOverlaysIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
          isOverlays
        />
        <TabItem
          label="Stats"
          isActive={activeTab === 'stats'}
          onPress={handleStatsPress}
          renderIcon={renderStatsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
          isStats
        />
        <TabItem
          label="Settings"
          isActive={activeTab === 'settings'}
          onPress={handleSettingsPress}
          renderIcon={renderSettingsIcon}
          activeColor={colors.text}
          inactiveColor={colors.textMuted}
          isSettings
        />
      </View>
    </View>
  );
}

export default memo(BottomTabBar);
