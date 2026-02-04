import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticStrength } from '../utils/haptics';

// Text size classes
export const textSize = {
  extraSmall: 'text-xs',
  small: 'text-sm',
  base: 'text-base',
  large: 'text-lg',
  xLarge: 'text-xl',
  '2xLarge': 'text-2xl',
  '4xLarge': 'text-4xl',
} as const;

// Font classes
export const fontFamily = {
  regular: 'font-nunito',
  light: 'font-nunito-light',
  medium: 'font-nunito-medium',
  semibold: 'font-nunito-semibold',
  bold: 'font-nunito-bold',
} as const;

// Font weight paired with text size:
// text-base and above → semibold, text-sm → semibold, text-xs → medium
export const fontForSize = {
  extraSmall: fontFamily.medium,       // text-xs → medium
  small: fontFamily.semibold,          // text-sm → semibold
  base: fontFamily.semibold,           // text-base → semibold
  large: fontFamily.semibold,          // text-lg → semibold
  xLarge: fontFamily.semibold,         // text-xl → semibold
  '2xLarge': fontFamily.semibold,      // text-2xl → semibold
  '4xLarge': fontFamily.semibold,      // text-4xl → semibold
} as const;

// Icon sizes (use inside s() for responsive scaling)
export const iconSize = {
  xs: 16,      // Small badge icons (preset card badges, settings row arrows)
  sm: 18,      // Tab icons in PresetEditModal (apps, globe, android)
  md: 20,      // Settings row icons, search icons, eye icons, alert icons
  lg: 24,      // Navigation arrows, chevrons, action icons, tab bar icons
  xl: 28,      // Info modal display icons
  headerNav: 24, // Header navigation icons (close X, chevron next/back)
} as const;

// Button padding sizes (use inside s() for responsive scaling)
export const buttonPadding = {
  standard: 16,   
     // All buttons, rows, toggles, icon buttons, list items, etc.
  smallStandard: 10,    // Compact buttons (select all, deselect all, etc.)
  tabItem: 8,          // Bottom tab bar items
} as const;

// Border radius classes
export const radius = {
  AMPM : 'rounded-lg',
  lg: 'rounded-2xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

// Shadow style objects
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  tabBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
} as const;

// Colors
export const colors = {
  bg: '#28282B',
  card: '#363639',
  cardLight: '#424245',
  border: '#3a3a3d',
  divider: '#454548',
  dividerLight: '#3a3a3d',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  // Accent colors
  cyan: '#22d3ee',
  cyanDark: '#0891b2',
  green: '#22c55e',
  yellow: '#fbbf24',
  red: '#FF5C5C',
  // Logo tint
  logoTint: '#ffffff',
} as const;

/**
 * Haptic strength: 0 = off, 0.5 = half, 1 = full (default).
 * Persisted to AsyncStorage so it survives app restarts.
 */
const HAPTIC_STRENGTH_KEY = 'haptic_strength';

interface ThemeContextType {
  colors: typeof colors;
  /** Current haptic strength multiplier (0‒1). */
  hapticStrength: number;
  /** Update the global haptic strength (0‒1). Persists automatically. */
  setHapticStrengthValue: (value: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [hapticStrengthState, setHapticStrengthState] = useState(0.4);

  // Load persisted value on mount
  useEffect(() => {
    AsyncStorage.getItem(HAPTIC_STRENGTH_KEY).then((stored) => {
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed)) {
          const clamped = Math.max(0, Math.min(1, parsed));
          setHapticStrengthState(clamped);
          setHapticStrength(clamped);
        }
      }
    });
  }, []);

  const setHapticStrengthValue = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setHapticStrengthState(clamped);
    setHapticStrength(clamped);
    AsyncStorage.setItem(HAPTIC_STRENGTH_KEY, String(clamped));
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({ colors, hapticStrength: hapticStrengthState, setHapticStrengthValue }),
    [hapticStrengthState, setHapticStrengthValue],
  );

  return (
    <ThemeContext.Provider value={value}>
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
