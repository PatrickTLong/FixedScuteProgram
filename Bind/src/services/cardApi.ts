/**
 * API Service
 * Handles user data, presets, and app blocking functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// ============ JWT Token Management ============
const TOKEN_KEY = '@scute_auth_token';
let cachedToken: string | null = null;

/**
 * Store JWT token securely
 */
export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  console.log('[CardAPI] Auth token stored');
}

/**
 * Get stored JWT token
 */
export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

/**
 * Clear JWT token (on logout)
 */
export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  console.log('[CardAPI] Auth token cleared');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Get authorization headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) {
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ============ API Cache Layer ============
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();

// Cache TTL in milliseconds
const CACHE_TTL = {
  presets: 30000,      // 30 seconds - presets change rarely
  lockStatus: 10000,   // 10 seconds - balance between freshness and performance
};

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyPattern?: string): void {
  if (keyPattern) {
    for (const key of cache.keys()) {
      if (key.includes(keyPattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * Clear all caches for a specific user - useful when switching tabs or refreshing
 */
export function invalidateUserCaches(email: string): void {
  const normalizedEmail = email.toLowerCase();
  invalidateCache(`presets:${normalizedEmail}`);
  invalidateCache(`lockStatus:${normalizedEmail}`);
}

// Track users who have already been initialized this session to prevent duplicate calls
const initializedUsers: Set<string> = new Set();

// Track if this is the first load of the app session
let isFirstAppLoad = true;

/**
 * Clear all caches completely - useful when data might be stale
 * Also resets initialization tracking to ensure fresh state on app restart
 */
export function clearAllCaches(): void {
  cache.clear();
  pendingRequests.clear();
  initializedUsers.clear();
  isFirstAppLoad = true;
}

/**
 * Check if this is the first load of the app session
 * Used to ensure fresh data on app restart
 */
export function isFirstLoad(): boolean {
  return isFirstAppLoad;
}

/**
 * Mark that initial load is complete
 */
export function markInitialLoadComplete(): void {
  isFirstAppLoad = false;
}

// ============ Request Deduplication ============
// Prevents multiple simultaneous requests for the same data
const pendingRequests: Map<string, Promise<any>> = new Map();

function deduplicatedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

export interface TapSettings {
  mode: 'all' | 'specific';
  selectedApps: string[];
  blockedWebsites: string[];
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  timerSeconds: number;
  blockSettings: boolean;
  noTimeLimit?: boolean;
}

/**
 * Save user settings via backend API
 */
export async function saveUserSettings(email: string, settings: TapSettings): Promise<void> {
  console.log('[CardAPI] saveUserSettings called for:', email);
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/save-settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[CardAPI] saveUserSettings error:', data.error);
    } else {
      console.log('[CardAPI] saveUserSettings success');
    }
  } catch (error) {
    console.error('[CardAPI] saveUserSettings error:', error);
  }
}

/**
 * Delete user account via backend API
 * Note: This deletes from users and user_cards tables, NOT the whitelist
 */
export async function deleteAccount(email: string): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] deleteAccount called for:', email);
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/delete-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] deleteAccount error:', data.error);
      return { success: false, error: data.error || 'Failed to delete account' };
    }

    // Invalidate all caches for this user
    invalidateCache(`userCardData:${normalizedEmail}`);
    invalidateCache(`presets:${normalizedEmail}`);
    invalidateCache(`lockStatus:${normalizedEmail}`);

    // Clear auth token on account deletion
    await clearAuthToken();

    console.log('[CardAPI] Account deleted:', normalizedEmail);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error deleting account:', error);
    return { success: false, error: 'Network error' };
  }
}

// ============ Preset Functions ============

export interface Preset {
  id: string;
  name: string;
  mode: 'all' | 'specific';
  selectedApps: string[];
  blockedWebsites: string[];
  timerDays: number;
  timerHours: number;
  timerMinutes: number;
  timerSeconds: number;
  noTimeLimit: boolean;
  blockSettings: boolean;
  isActive: boolean;
  isDefault: boolean;
  targetDate?: string | null;
  // Emergency tapout feature (per-preset toggle)
  allowEmergencyTapout?: boolean;
  // Scheduling feature
  isScheduled?: boolean;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
  // Recurring schedule feature (DB columns)
  repeat_enabled?: boolean;
  repeat_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  repeat_interval?: number;
}

/**
 * Get all presets for a user (cached + deduplicated)
 */
export async function getPresets(email: string, skipCache = false): Promise<Preset[]> {
  const normalizedEmail = email.toLowerCase();
  const cacheKey = `presets:${normalizedEmail}`;

  // Check in-memory cache first
  if (!skipCache) {
    const cached = getCached<Preset[]>(cacheKey, CACHE_TTL.presets);
    if (cached) {
      console.log('[CardAPI] getPresets returning cached data');
      return cached;
    }
  }

  console.log('[CardAPI] getPresets fetching from API');
  // Use deduplication to prevent multiple simultaneous requests
  return deduplicatedRequest(cacheKey, async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/presets`, { headers });
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[CardAPI] getPresets error:', data.error);
        return [];
      }

      const presets = data.presets || [];
      console.log('[CardAPI] getPresets success, count:', presets.length);
      setCache(cacheKey, presets);
      return presets;
    } catch (error) {
      console.error('[CardAPI] getPresets error:', error);
      return [];
    }
  });
}

/**
 * Save a preset (create or update)
 */
export async function savePreset(email: string, preset: Preset): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] savePreset called:', preset.name);
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/presets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ preset }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] savePreset error:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] savePreset success:', preset.name);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] savePreset error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Update schedule dates for a recurring preset
 * Called when Android calculates the next occurrence
 */
export async function updatePresetSchedule(
  email: string,
  presetId: string,
  scheduleStartDate: string,
  scheduleEndDate: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] ========== RECURRING UPDATE SCHEDULE ==========');
  console.log('[CardAPI] updatePresetSchedule called');
  console.log('[CardAPI]   Email:', email);
  console.log('[CardAPI]   Preset ID:', presetId);
  console.log('[CardAPI]   New start date:', scheduleStartDate);
  console.log('[CardAPI]   New end date:', scheduleEndDate);

  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    console.log('[CardAPI] Sending POST to:', `${API_URL}/api/presets/update-schedule`);
    console.log('[CardAPI] Request body:', JSON.stringify({ presetId, scheduleStartDate, scheduleEndDate }));

    const response = await fetch(`${API_URL}/api/presets/update-schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ presetId, scheduleStartDate, scheduleEndDate }),
    });

    console.log('[CardAPI] Response status:', response.status);
    const data = await response.json();
    console.log('[CardAPI] Response data:', JSON.stringify(data));

    if (!response.ok) {
      console.error('[CardAPI] updatePresetSchedule error:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache so UI gets updated dates
    console.log('[CardAPI] Invalidating presets cache for:', normalizedEmail);
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] updatePresetSchedule SUCCESS for preset:', presetId);
    console.log('[CardAPI] ========== RECURRING UPDATE COMPLETE ==========');
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] updatePresetSchedule EXCEPTION:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(email: string, presetId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] deletePreset called:', presetId);
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/presets`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ presetId }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] deletePreset error:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] deletePreset success:', presetId);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] deletePreset error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Activate a preset (deactivates others and saves settings to user_cards)
 */
export async function activatePreset(email: string, presetId: string | null): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] activatePreset called:', presetId);
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/presets/activate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ presetId }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] activatePreset error:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate caches - activation changes presets and user card data
    invalidateCache(`presets:${normalizedEmail}`);
    invalidateCache(`userCardData:${normalizedEmail}`);
    console.log('[CardAPI] activatePreset success:', presetId);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] activatePreset error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Initialize default presets for a new user
 * Uses session-level deduplication to prevent repeated API calls
 */
export async function initDefaultPresets(email: string): Promise<{ success: boolean; created: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  // Check if already initialized this session
  if (initializedUsers.has(normalizedEmail)) {
    return { success: true, created: false };
  }

  // Use deduplication to prevent multiple simultaneous requests
  const key = `initDefaults:${normalizedEmail}`;
  return deduplicatedRequest(key, async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/presets/init-defaults`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[CardAPI] Error initializing default presets:', data.error);
        return { success: false, created: false, error: data.error };
      }

      // Mark as initialized for this session
      initializedUsers.add(normalizedEmail);

      // Only invalidate cache if defaults were actually created
      if (data.created) {
        invalidateCache(`presets:${normalizedEmail}`);
        console.log('[CardAPI] Default presets initialized for:', normalizedEmail);
      }
      return { success: true, created: data.created || false };
    } catch (error) {
      console.error('[CardAPI] Error initializing default presets:', error);
      return { success: false, created: false, error: 'Network error' };
    }
  });
}

/**
 * Reset all presets to defaults (deletes all and recreates default presets)
 */
export async function resetPresets(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/presets/reset`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error resetting presets:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] Presets reset for:', normalizedEmail);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error resetting presets:', error);
    return { success: false, error: 'Network error' };
  }
}

// ============ Lock Status Functions ============

export interface LockStatus {
  isLocked: boolean;
  lockStartedAt: string | null;
  lockEndsAt: string | null;
}

/**
 * Update user's lock status
 */
export async function updateLockStatus(
  email: string,
  isLocked: boolean,
  lockEndsAt?: string | null
): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] updateLockStatus called:', { isLocked, lockEndsAt });
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/lock-status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ isLocked, lockEndsAt }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] updateLockStatus error:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate lock status cache
    invalidateCache(`lockStatus:${normalizedEmail}`);
    console.log('[CardAPI] updateLockStatus success:', isLocked);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] updateLockStatus error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get user's lock status (cached + deduplicated)
 */
export async function getLockStatus(email: string, skipCache = false): Promise<LockStatus> {
  const normalizedEmail = email.toLowerCase();
  const cacheKey = `lockStatus:${normalizedEmail}`;

  // Check in-memory cache first
  if (!skipCache) {
    const cached = getCached<LockStatus>(cacheKey, CACHE_TTL.lockStatus);
    if (cached) {
      console.log('[CardAPI] getLockStatus returning cached data');
      return cached;
    }
  }

  console.log('[CardAPI] getLockStatus fetching from API');
  // Use deduplication to prevent multiple simultaneous requests
  return deduplicatedRequest(cacheKey, async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/lock-status`, { headers });
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[CardAPI] getLockStatus error:', data.error);
        return { isLocked: false, lockStartedAt: null, lockEndsAt: null };
      }

      const result: LockStatus = {
        isLocked: data.isLocked || false,
        lockStartedAt: data.lockStartedAt,
        lockEndsAt: data.lockEndsAt,
      };

      console.log('[CardAPI] getLockStatus success:', result.isLocked);
      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[CardAPI] getLockStatus error:', error);
      return { isLocked: false, lockStartedAt: null, lockEndsAt: null };
    }
  });
}

// Emergency Tapout Types
export interface EmergencyTapoutStatus {
  remaining: number;
  nextRefillDate: string | null; // When the next +1 tapout will be granted (null if at 3)
}

/**
 * Get user's emergency tapout status
 * Gradual refill system: +1 tapout every 2 weeks until back to 3
 */
export async function getEmergencyTapoutStatus(email: string): Promise<EmergencyTapoutStatus> {
  console.log('[CardAPI] getEmergencyTapoutStatus called');
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/emergency-tapout`, { headers });
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[CardAPI] getEmergencyTapoutStatus error:', data.error);
      return { remaining: 3, nextRefillDate: null };
    }

    console.log('[CardAPI] getEmergencyTapoutStatus success, remaining:', data.remaining);
    return {
      remaining: data.remaining ?? 3,
      nextRefillDate: data.nextRefillDate ?? null,
    };
  } catch (error) {
    console.error('[CardAPI] getEmergencyTapoutStatus error:', error);
    return { remaining: 3, nextRefillDate: null };
  }
}

/**
 * Update emergency tapout enabled setting
 */
export async function setEmergencyTapoutEnabled(email: string, enabled: boolean): Promise<{ success: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/emergency-tapout/toggle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled }),
    });

    const data = await response.json();
    return { success: response.ok && !data.error };
  } catch (error) {
    console.error('[CardAPI] Error setting emergency tapout:', error);
    return { success: false };
  }
}

/**
 * Use one emergency tapout
 * @param email - User's email
 * @param presetId - Optional preset ID to deactivate (if not provided, all active presets are deactivated)
 */
export async function useEmergencyTapout(email: string, presetId?: string): Promise<{ success: boolean; remaining: number }> {
  console.log('[CardAPI] useEmergencyTapout called, presetId:', presetId);
  const normalizedEmail = email.toLowerCase();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/emergency-tapout/use`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ presetId }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[CardAPI] useEmergencyTapout error:', data.error);
      return { success: false, remaining: 0 };
    }

    // Invalidate presets cache since the preset was deactivated
    invalidateCache(`presets:${normalizedEmail}`);

    console.log('[CardAPI] useEmergencyTapout success, remaining:', data.remaining);
    return { success: true, remaining: data.remaining ?? 0 };
  } catch (error) {
    console.error('[CardAPI] useEmergencyTapout error:', error);
    return { success: false, remaining: 0 };
  }
}

// ============ Theme Functions ============

export type ThemeType = 'dark' | 'light';

/**
 * Get user's theme preference
 */
export async function getUserTheme(email: string): Promise<ThemeType> {
  console.log('[CardAPI] getUserTheme called');
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/user-theme`, { headers });
    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[CardAPI] getUserTheme error:', data.error);
      return 'dark'; // Default to dark
    }

    console.log('[CardAPI] getUserTheme success:', data.theme);
    return data.theme === 'light' ? 'light' : 'dark';
  } catch (error) {
    console.error('[CardAPI] getUserTheme error:', error);
    return 'dark';
  }
}

/**
 * Save user's theme preference
 */
export async function saveUserTheme(email: string, theme: ThemeType): Promise<{ success: boolean; error?: string }> {
  console.log('[CardAPI] saveUserTheme called:', theme);
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/user-theme`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ theme }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] saveUserTheme error:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[CardAPI] saveUserTheme success:', theme);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] saveUserTheme error:', error);
    return { success: false, error: 'Network error' };
  }
}

export default {
  // Auth token functions
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  isAuthenticated,
  // Account functions
  deleteAccount,
  saveUserSettings,
  // Preset functions
  getPresets,
  savePreset,
  deletePreset,
  activatePreset,
  initDefaultPresets,
  resetPresets,
  updatePresetSchedule,
  // Lock status functions
  updateLockStatus,
  getLockStatus,
  // Emergency tapout functions
  getEmergencyTapoutStatus,
  setEmergencyTapoutEnabled,
  useEmergencyTapout,
  // Theme functions
  getUserTheme,
  saveUserTheme,
  // Cache management
  invalidateCache,
  invalidateUserCaches,
  clearAllCaches,
  isFirstLoad,
  markInitialLoadComplete,
};
