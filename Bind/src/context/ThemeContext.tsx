import React, { createContext, useContext, useMemo } from 'react';

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
  regular: 'font-nunito-bold',
  light: 'font-nunito-bold',
  medium: 'font-nunito-bold',
  semibold: 'font-nunito-bold',
  bold: 'font-nunito-bold',
} as const;

// Font weight paired with text size:
// Large and above → bold, base → semibold, small → medium, extraSmall → regular
export const fontForSize = {
  extraSmall: fontFamily.regular,      // text-xs → regular
  small: fontFamily.medium,            // text-sm → medium
  base: fontFamily.semibold,           // text-base → semibold
  large: fontFamily.bold,              // text-lg → bold
  xLarge: fontFamily.bold,             // text-xl → bold
  '2xLarge': fontFamily.bold,          // text-2xl → bold
  '4xLarge': fontFamily.bold,          // text-4xl → bold
} as const;

// Icon sizes (use inside s() for responsive scaling)
export const iconSize = {
  xs: 16,      // Small badge icons (preset card badges, settings row arrows)
  sm: 18,      // Tab icons in PresetEditModal (apps, globe, android)
  md: 24,      // Settings row icons, search icons, eye icons, alert icons
  lg: 24,      // Navigation arrows, action icons, tab bar icons
  xl: 28,
  exl: 36,      // Info modal display icons
  headerNav: 24, // Header navigation icons (close X, chevron next/back)
  chevron: 20,   // Chevrons in settings rows (settings, preset settings)
  forTabs: 24,   // Icons for tabs in preset settings (calendar, flag, etc.)
  toggleRow: 28, // Toggle row icons in final settings (no time limit, strict mode, etc.)
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
  // Loading spinner
  spinnerBlue: '#8E99A4',
  // Logo tint
  logoTint: '#ffffff',
} as const;

interface ThemeContextType {
  colors: typeof colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeContextType>(
    () => ({ colors }),
    [],
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
