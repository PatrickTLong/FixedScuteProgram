/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback across the app.
 *
 * Strength is controlled globally via `setHapticStrength(n)` where
 *   0 = haptics off, 1 = full strength (default).
 * All five tap functions automatically scale their vibration durations
 * by the current strength value.
 */

import { Vibration, Platform } from 'react-native';

// ── Global strength multiplier (0‒1) ──────────────────────────────
let _strength = 0.4;

/** Call this from ThemeContext to sync the strength value. */
export function setHapticStrength(value: number): void {
  _strength = Math.max(0, Math.min(1, value));
}

export function getHapticStrength(): number {
  return _strength;
}

// ── Helpers ────────────────────────────────────────────────────────
function vibrate(ms: number): void {
  if (Platform.OS === 'android' && _strength > 0) {
    Vibration.vibrate(Math.round(ms * _strength));
  }
}

function vibratePattern(pattern: number[]): void {
  if (Platform.OS === 'android' && _strength > 0) {
    // Scale only the vibration durations (odd indices), keep pauses as-is
    const scaled = pattern.map((v, i) =>
      i % 2 === 1 ? Math.round(v * _strength) : v,
    );
    Vibration.vibrate(scaled);
  }
}

// ── Tap functions (labels unchanged so every call site still works) ─
/**
 * **Light** — general button presses, tab switches
 * Base duration: 10 ms
 */
export function lightTap(): void {
  vibrate(10);
}

/**
 * **Medium** — toggle switches, selections
 * Base duration: 20 ms
 */
export function mediumTap(): void {
  vibrate(20);
}

/**
 * **Success** — successful actions (double-pulse pattern)
 * Base pattern: [0, 15, 50, 15] ms
 */
export function successTap(): void {
  vibratePattern([0, 15, 50, 15]);
}

/**
 * **Error** — errors or destructive actions (double-pulse pattern)
 * Base pattern: [0, 30, 50, 30] ms
 */
export function errorTap(): void {
  vibratePattern([0, 30, 50, 30]);
}

/**
 * **Heavy** — important actions like confirm / delete
 * Base duration: 40 ms
 */
export function heavyTap(): void {
  vibrate(40);
}

export default {
  lightTap,
  mediumTap,
  successTap,
  errorTap,
  heavyTap,
};
