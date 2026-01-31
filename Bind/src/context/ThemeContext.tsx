import React, { createContext, useContext } from 'react';

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
  semibold: 'font-nunito-semibold',
  bold: 'font-nunito-bold',
} as const;

// Border radius classes
export const radius = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
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
  border: '#3d3d40',
  divider: '#3a3a3d',
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

interface ThemeContextType {
  colors: typeof colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors }}>
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
