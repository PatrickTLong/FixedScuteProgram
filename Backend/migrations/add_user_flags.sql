-- Add per-user TOS acceptance and onboarding completion flags to user_cards
-- These were previously stored only in AsyncStorage (per-device), now per-user on backend

ALTER TABLE user_cards
  ADD COLUMN IF NOT EXISTS tos_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
