import { useWindowDimensions } from 'react-native';

// Base width for scaling (iPhone 14 / standard Android)
const BASE_WIDTH = 390;

/**
 * Hook that provides responsive scaling functions based on screen width.
 * All dimensions are designed for a 390px width device and scale proportionally.
 */
export function useResponsive() {
  const { width } = useWindowDimensions();
  const scale = width / BASE_WIDTH;

  /**
   * Scale a pixel value proportionally to screen width.
   * Use for: widths, heights, padding, margins, border radius, image sizes
   */
  const s = (size: number): number => Math.round(size * scale);

  /**
   * Scale font size with a dampened factor to prevent text from getting too large/small.
   * Uses 50% of the scale difference to keep text more readable across devices.
   */
  const fs = (size: number): number => {
    const dampedScale = 1 + (scale - 1) * 0.5;
    return Math.round(size * dampedScale);
  };

  return { s, fs, scale, width };
}

/**
 * Non-hook version for use in static contexts.
 * Uses a fixed scale factor - prefer useResponsive() when possible.
 */
export function getStaticScale(windowWidth: number): number {
  return windowWidth / BASE_WIDTH;
}
