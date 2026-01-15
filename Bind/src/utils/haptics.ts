/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback across the app
 */

import { Vibration, Platform } from 'react-native';

// Light tap - for general button presses, tab switches
export function lightTap(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(10);
  }
}

// Medium tap - for toggle switches, selections
export function mediumTap(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(20);
  }
}

// Success feedback - for successful actions
export function successTap(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 15, 50, 15]);
  }
}

// Error/warning feedback - for errors or destructive actions
export function errorTap(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 30, 50, 30]);
  }
}

// Heavy tap - for important actions like confirm/delete
export function heavyTap(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(40);
  }
}

export default {
  lightTap,
  mediumTap,
  successTap,
  errorTap,
  heavyTap,
};
