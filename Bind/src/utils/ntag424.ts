/**
 * NTAG424 DNA Utilities
 *
 * This module provides utilities for working with NTAG424 DNA NFC cards.
 *
 * Security is now handled via server-side UID whitelist validation.
 * See src/services/cardApi.ts for the card registration logic.
 */

/**
 * Normalize a UID string (remove colons, uppercase)
 */
export function normalizeUid(uid: string): string {
  return uid.replace(/:/g, '').toUpperCase();
}

/**
 * Format a UID for display (with colons between bytes)
 */
export function formatUidForDisplay(uid: string): string {
  const normalized = normalizeUid(uid);
  return normalized.match(/.{1,2}/g)?.join(':') || normalized;
}

/**
 * Compare two UIDs (handles different formats)
 */
export function compareUids(uid1: string, uid2: string): boolean {
  return normalizeUid(uid1) === normalizeUid(uid2);
}

/**
 * Validate that a UID looks like a valid NTAG424 DNA UID
 * NTAG424 DNA has a 7-byte UID (14 hex characters)
 */
export function isValidNtag424Uid(uid: string): boolean {
  const normalized = normalizeUid(uid);
  // NTAG424 DNA UIDs are 7 bytes = 14 hex characters
  // But some readers may return different formats
  return /^[0-9A-F]{14}$/i.test(normalized) || /^[0-9A-F]{8}$/i.test(normalized);
}

export default {
  normalizeUid,
  formatUidForDisplay,
  compareUids,
  isValidNtag424Uid,
};
