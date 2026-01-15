/**
 * Card API Service
 * Handles Supabase-based UID whitelist validation for Scute cards
 *
 * Database Tables:
 * - valid_scute_uids: List of valid Scute card UIDs (added by admin before shipping)
 * - user_cards: Links users to their registered cards and settings
 */

import supabase from '../config/supabase';

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
  userCardData: 30000, // 30 seconds
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
  invalidateCache(`userCardData:${normalizedEmail}`);
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

export interface UserCardData {
  uid: string | null;
  settings: TapSettings | null;
  registered_at: string | null;
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

export interface CardRegistrationResult {
  success: boolean;
  error?: string;
  errorCode?: 'NOT_FOUND' | 'ALREADY_REGISTERED' | 'EMAIL_HAS_CARD' | 'NETWORK_ERROR' | 'SERVER_ERROR';
}

export interface CardAddResult {
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
}

export interface CardEntry {
  uid: string;
  email: string | null;
  registered_at: string | null;
}

// ============ Helper functions ============

/**
 * Normalize UID format (remove colons, uppercase)
 */
function normalizeUid(uid: string): string {
  return uid.replace(/:/g, '').toUpperCase();
}

/**
 * Format UID for display (with colons)
 */
export function formatUidForDisplay(uid: string): string {
  const normalized = normalizeUid(uid);
  return normalized.match(/.{1,2}/g)?.join(':') || normalized;
}

// ============ User Card Functions ============

/**
 * Initialize user data when they register their email
 * Creates an entry with null UID and null settings
 */
export async function initializeUserData(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('user_cards')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from('user_cards')
        .insert({
          email: normalizedEmail,
          uid: null,
          settings: null,
          registered_at: null,
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('[CardAPI] Error initializing user data:', error);
      } else {
        console.log('[CardAPI] Initialized user data for:', normalizedEmail);
      }
    }
  } catch (error) {
    console.error('[CardAPI] Error initializing user data:', error);
  }
}

// Backend API URL
const API_URL = 'http://10.0.0.252:3000';

/**
 * Get user card data via backend API (cached)
 */
export async function getUserCardData(email: string, skipCache = false): Promise<UserCardData | null> {
  const normalizedEmail = email.toLowerCase();
  const cacheKey = `userCardData:${normalizedEmail}`;

  // Check cache first
  if (!skipCache) {
    const cached = getCached<UserCardData>(cacheKey, CACHE_TTL.userCardData);
    if (cached) return cached;
  }

  try {
    const response = await fetch(`${API_URL}/api/user-card-data?email=${encodeURIComponent(normalizedEmail)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      return null;
    }

    const result: UserCardData = {
      uid: data.uid,
      settings: data.settings as TapSettings | null,
      registered_at: data.registered_at,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[CardAPI] Error getting user card data:', error);
    return null;
  }
}

/**
 * Save user settings via backend API
 */
export async function saveUserSettings(email: string, settings: TapSettings): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/save-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, settings }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[CardAPI] Error saving settings:', data.error);
    } else {
      console.log('[CardAPI] Saved settings for:', normalizedEmail);
    }
  } catch (error) {
    console.error('[CardAPI] Error saving settings:', error);
  }
}

// ============ Card Registration Functions ============

/**
 * Register a card to a user's email via backend API
 */
export async function registerCard(uid: string, email: string): Promise<CardRegistrationResult> {
  const normalizedUid = normalizeUid(uid);
  const normalizedEmail = email.toLowerCase();

  console.log('[CardAPI] registerCard called:');
  console.log('[CardAPI]   Raw UID:', uid);
  console.log('[CardAPI]   Normalized UID:', normalizedUid);
  console.log('[CardAPI]   Email:', normalizedEmail);
  console.log('[CardAPI]   API URL:', `${API_URL}/api/register-card`);

  try {
    const response = await fetch(`${API_URL}/api/register-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: normalizedUid, email: normalizedEmail }),
    });

    const data = await response.json();
    console.log('[CardAPI] Response status:', response.status);
    console.log('[CardAPI] Response data:', JSON.stringify(data));

    if (!response.ok) {
      console.log('[CardAPI] Registration rejected:', data.error, 'errorCode:', data.errorCode);
      return {
        success: false,
        error: data.error || 'Failed to register card',
        errorCode: data.errorCode || 'SERVER_ERROR'
      };
    }

    // Invalidate user card data cache so fresh data is fetched
    invalidateCache(`userCardData:${normalizedEmail}`);
    console.log('[CardAPI] Card registered:', { uid: normalizedUid, email: normalizedEmail });
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error registering card:', error);
    return { success: false, error: 'Network error', errorCode: 'NETWORK_ERROR' };
  }
}

/**
 * Add a new card UID to the whitelist (admin only)
 * This calls the backend API since only service role can insert to valid_scute_uids
 */
export async function addCardToWhitelist(uid: string, adminEmail?: string): Promise<CardAddResult> {
  const normalizedUid = normalizeUid(uid);

  try {
    const response = await fetch(`${API_URL}/api/add-card-to-whitelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: normalizedUid, adminEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error adding to whitelist:', data.error);
      return { success: false, error: data.error || 'Failed to add card' };
    }

    if (data.alreadyExists) {
      console.log('[CardAPI] UID already in whitelist:', normalizedUid);
      return { success: false, error: 'Card already exists in database', alreadyExists: true };
    }

    console.log('[CardAPI] UID added to whitelist:', normalizedUid);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error adding to whitelist:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Check if a UID exists in the whitelist
 */
export async function checkCardExists(uid: string): Promise<{ exists: boolean; registered: boolean; email?: string }> {
  const normalizedUid = normalizeUid(uid);

  try {
    // Check if in valid UIDs list
    const { data: validUid } = await supabase
      .from('valid_scute_uids')
      .select('uid')
      .eq('uid', normalizedUid)
      .single();

    if (!validUid) {
      return { exists: false, registered: false };
    }

    // Check if registered to any user
    const { data: userCard } = await supabase
      .from('user_cards')
      .select('email')
      .eq('uid', normalizedUid)
      .single();

    if (userCard) {
      return { exists: true, registered: true, email: userCard.email };
    }

    return { exists: true, registered: false };
  } catch (error) {
    console.error('[CardAPI] Error checking card:', error);
    return { exists: false, registered: false };
  }
}

/**
 * Check if an email already has a card registered
 */
export async function checkEmailHasCard(email: string): Promise<{ hasCard: boolean; uid?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const { data } = await supabase
      .from('user_cards')
      .select('uid')
      .eq('email', normalizedEmail)
      .single();

    if (data?.uid) {
      return { hasCard: true, uid: data.uid };
    }

    return { hasCard: false };
  } catch (error) {
    console.error('[CardAPI] Error checking email:', error);
    return { hasCard: false };
  }
}

/**
 * Unregister a card via backend API
 * Note: This only clears the user's card registration, NOT the whitelist
 */
export async function unregisterCard(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/unregister-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error unregistering card:', data.error);
      return { success: false, error: data.error || 'Failed to unregister card' };
    }

    // Invalidate user card data cache
    invalidateCache(`userCardData:${normalizedEmail}`);
    console.log('[CardAPI] Card unregistered for:', normalizedEmail);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error unregistering card:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Delete user account via backend API
 * Note: This deletes from users and user_cards tables, NOT the whitelist
 */
export async function deleteAccount(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error deleting account:', data.error);
      return { success: false, error: data.error || 'Failed to delete account' };
    }

    // Invalidate all caches for this user
    invalidateCache(`userCardData:${normalizedEmail}`);
    invalidateCache(`presets:${normalizedEmail}`);
    invalidateCache(`lockStatus:${normalizedEmail}`);
    console.log('[CardAPI] Account deleted:', normalizedEmail);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error deleting account:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get all cards in the database (admin only)
 */
export async function getAllCards(): Promise<CardEntry[]> {
  try {
    // Get all valid UIDs
    const { data: validUids, error: uidsError } = await supabase
      .from('valid_scute_uids')
      .select('uid');

    if (uidsError || !validUids) {
      console.error('[CardAPI] Error getting valid UIDs:', uidsError);
      return [];
    }

    // Get all user cards
    const { data: userCards, error: cardsError } = await supabase
      .from('user_cards')
      .select('email, uid, registered_at')
      .not('uid', 'is', null);

    if (cardsError) {
      console.error('[CardAPI] Error getting user cards:', cardsError);
    }

    // Build map of UID -> user data
    const uidToUser: { [uid: string]: { email: string; registered_at: string | null } } = {};
    if (userCards) {
      for (const card of userCards) {
        if (card.uid) {
          uidToUser[normalizeUid(card.uid)] = {
            email: card.email,
            registered_at: card.registered_at,
          };
        }
      }
    }

    // Return all valid UIDs with registration status
    return validUids.map((item: { uid: string }) => {
      const normalizedUid = normalizeUid(item.uid);
      const userData = uidToUser[normalizedUid];
      return {
        uid: formatUidForDisplay(item.uid),
        email: userData?.email || null,
        registered_at: userData?.registered_at || null,
      };
    });
  } catch (error) {
    console.error('[CardAPI] Error getting all cards:', error);
    return [];
  }
}

/**
 * Get all valid UIDs (admin only)
 */
export async function getValidUidsList(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('valid_scute_uids')
      .select('uid');

    if (error || !data) {
      console.error('[CardAPI] Error getting valid UIDs:', error);
      return [];
    }

    return data.map((item: { uid: string }) => formatUidForDisplay(item.uid));
  } catch (error) {
    console.error('[CardAPI] Error getting valid UIDs:', error);
    return [];
  }
}

/**
 * Clear the entire database (admin only)
 */
export async function clearDatabase(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get count before clearing
    const { data: validUids } = await supabase
      .from('valid_scute_uids')
      .select('uid');

    const count = validUids?.length || 0;

    // Clear valid UIDs
    const { error: uidsError } = await supabase
      .from('valid_scute_uids')
      .delete()
      .neq('uid', ''); // Delete all

    if (uidsError) {
      console.error('[CardAPI] Error clearing valid UIDs:', uidsError);
      return { success: false, count: 0, error: 'Failed to clear database' };
    }

    // Clear all user card UIDs and settings
    const { error: cardsError } = await supabase
      .from('user_cards')
      .update({ uid: null, settings: null, registered_at: null })
      .neq('email', ''); // Update all

    if (cardsError) {
      console.error('[CardAPI] Error clearing user cards:', cardsError);
    }

    console.log('[CardAPI] Database cleared, removed', count, 'valid UIDs');
    return { success: true, count };
  } catch (error) {
    console.error('[CardAPI] Clear database error:', error);
    return { success: false, count: 0, error: 'Failed to clear database' };
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
    if (cached) return cached;
  }

  // Use deduplication to prevent multiple simultaneous requests
  return deduplicatedRequest(cacheKey, async () => {
    try {
      const response = await fetch(`${API_URL}/api/presets?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[CardAPI] Error fetching presets:', data.error);
        return [];
      }

      const presets = data.presets || [];
      setCache(cacheKey, presets);
      return presets;
    } catch (error) {
      console.error('[CardAPI] Error fetching presets:', error);
      return [];
    }
  });
}

/**
 * Save a preset (create or update)
 */
export async function savePreset(email: string, preset: Preset): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, preset }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error saving preset:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] Preset saved:', preset.name);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error saving preset:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(email: string, presetId: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/presets`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, presetId }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error deleting preset:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate presets cache
    invalidateCache(`presets:${normalizedEmail}`);
    console.log('[CardAPI] Preset deleted:', presetId);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error deleting preset:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Activate a preset (deactivates others and saves settings to user_cards)
 */
export async function activatePreset(email: string, presetId: string | null): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/presets/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, presetId }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error activating preset:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate caches - activation changes presets and user card data
    invalidateCache(`presets:${normalizedEmail}`);
    invalidateCache(`userCardData:${normalizedEmail}`);
    console.log('[CardAPI] Preset activated:', presetId);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error activating preset:', error);
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
      const response = await fetch(`${API_URL}/api/presets/init-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
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
    const response = await fetch(`${API_URL}/api/presets/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
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
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/lock-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, isLocked, lockEndsAt }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error updating lock status:', data.error);
      return { success: false, error: data.error };
    }

    // Invalidate lock status cache
    invalidateCache(`lockStatus:${normalizedEmail}`);
    console.log('[CardAPI] Lock status updated:', isLocked);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error updating lock status:', error);
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
    if (cached) return cached;
  }

  // Use deduplication to prevent multiple simultaneous requests
  return deduplicatedRequest(cacheKey, async () => {
    try {
      const response = await fetch(`${API_URL}/api/lock-status?email=${encodeURIComponent(normalizedEmail)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        return { isLocked: false, lockStartedAt: null, lockEndsAt: null };
      }

      const result: LockStatus = {
        isLocked: data.isLocked || false,
        lockStartedAt: data.lockStartedAt,
        lockEndsAt: data.lockEndsAt,
      };

      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[CardAPI] Error getting lock status:', error);
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
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/emergency-tapout?email=${encodeURIComponent(normalizedEmail)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      return { remaining: 3, nextRefillDate: null };
    }

    return {
      remaining: data.remaining ?? 3,
      nextRefillDate: data.nextRefillDate ?? null,
    };
  } catch (error) {
    console.error('[CardAPI] Error getting emergency tapout status:', error);
    return { remaining: 3, nextRefillDate: null };
  }
}

/**
 * Update emergency tapout enabled setting
 */
export async function setEmergencyTapoutEnabled(email: string, enabled: boolean): Promise<{ success: boolean }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/emergency-tapout/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, enabled }),
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
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/emergency-tapout/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, presetId }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return { success: false, remaining: 0 };
    }

    // Invalidate presets cache since the preset was deactivated
    invalidateCache(`presets:${normalizedEmail}`);

    return { success: true, remaining: data.remaining ?? 0 };
  } catch (error) {
    console.error('[CardAPI] Error using emergency tapout:', error);
    return { success: false, remaining: 0 };
  }
}

// ============ Theme Functions ============

export type ThemeType = 'dark' | 'light';

/**
 * Get user's theme preference
 */
export async function getUserTheme(email: string): Promise<ThemeType> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/user-theme?email=${encodeURIComponent(normalizedEmail)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      return 'dark'; // Default to dark
    }

    return data.theme === 'light' ? 'light' : 'dark';
  } catch (error) {
    console.error('[CardAPI] Error getting user theme:', error);
    return 'dark';
  }
}

/**
 * Save user's theme preference
 */
export async function saveUserTheme(email: string, theme: ThemeType): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/api/user-theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, theme }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardAPI] Error saving theme:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[CardAPI] Theme saved:', theme);
    return { success: true };
  } catch (error) {
    console.error('[CardAPI] Error saving theme:', error);
    return { success: false, error: 'Network error' };
  }
}

export default {
  registerCard,
  addCardToWhitelist,
  checkCardExists,
  checkEmailHasCard,
  unregisterCard,
  deleteAccount,
  getAllCards,
  clearDatabase,
  formatUidForDisplay,
  initializeUserData,
  getUserCardData,
  saveUserSettings,
  getValidUidsList,
  // Preset functions
  getPresets,
  savePreset,
  deletePreset,
  activatePreset,
  initDefaultPresets,
  resetPresets,
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
