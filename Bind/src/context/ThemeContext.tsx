import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'dark' | 'light';

// Color definitions for each theme
export const themeColors = {
  dark: {
    bg: '#28282B',
    card: '#363639',
    cardLight: '#424245',
    border: '#4a4a4d',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    // Accent colors
    cyan: '#22d3ee',
    cyanDark: '#0891b2',
    green: '#22c55e',
    greenDark: '#16a34a',
    yellow: '#fbbf24',
    red: '#ef4444',
    // Logo tint
    logoTint: '#ffffff',
  },
  light: {
    bg: '#f5f5f7',
    card: '#ffffff',
    cardLight: '#f0f0f2',
    border: '#e5e5e7',
    text: '#28282B', // Matte black instead of pitch black
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    // Accent colors
    cyan: '#22d3ee',
    cyanDark: '#0891b2',
    green: '#22c55e',
    greenDark: '#16a34a',
    yellow: '#fbbf24',
    red: '#ef4444',
    // Logo tint - matte black
    logoTint: '#28282B',
  },
};

// Animated colors type - all colors as Animated interpolations
export type AnimatedColors = {
  [K in keyof typeof themeColors.dark]: Animated.AnimatedInterpolation<string>;
};

interface ThemeContextType {
  theme: Theme;
  colors: typeof themeColors.dark;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  animatedBg: Animated.AnimatedInterpolation<string>;
  animatedColors: AnimatedColors;
  animationValue: Animated.Value;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem('app_theme').then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
        animationValue.setValue(savedTheme === 'light' ? 1 : 0);
      }
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === theme) return;

    setIsTransitioning(true);

    // Animate the transition
    Animated.timing(animationValue, {
      toValue: newTheme === 'light' ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Can't use native driver for color interpolation
    }).start(() => {
      setIsTransitioning(false);
    });

    setThemeState(newTheme);
    AsyncStorage.setItem('app_theme', newTheme);
  }, [theme, animationValue]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Animated background color
  const animatedBg = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [themeColors.dark.bg, themeColors.light.bg],
  });

  // Create animated interpolations for all colors
  const animatedColors: AnimatedColors = {
    bg: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.bg, themeColors.light.bg],
    }),
    card: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.card, themeColors.light.card],
    }),
    cardLight: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.cardLight, themeColors.light.cardLight],
    }),
    border: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.border, themeColors.light.border],
    }),
    text: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.text, themeColors.light.text],
    }),
    textSecondary: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.textSecondary, themeColors.light.textSecondary],
    }),
    textMuted: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.textMuted, themeColors.light.textMuted],
    }),
    cyan: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.cyan, themeColors.light.cyan],
    }),
    cyanDark: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.cyanDark, themeColors.light.cyanDark],
    }),
    green: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.green, themeColors.light.green],
    }),
    greenDark: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.greenDark, themeColors.light.greenDark],
    }),
    yellow: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.yellow, themeColors.light.yellow],
    }),
    red: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.red, themeColors.light.red],
    }),
    logoTint: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [themeColors.dark.logoTint, themeColors.light.logoTint],
    }),
  };

  const colors = themeColors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme, animatedBg, animatedColors, animationValue, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
