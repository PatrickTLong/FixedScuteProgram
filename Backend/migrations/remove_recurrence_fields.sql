-- Migration: Remove recurrence fields from user_presets table
-- Run this SQL in your Supabase SQL editor to remove recurring schedule support

-- Drop the index first
DROP INDEX IF EXISTS idx_user_presets_recurrence;

-- Drop constraints
ALTER TABLE user_presets
DROP CONSTRAINT IF EXISTS check_recurrence_unit;

ALTER TABLE user_presets
DROP CONSTRAINT IF EXISTS check_recurrence_interval_positive;

ALTER TABLE user_presets
DROP CONSTRAINT IF EXISTS check_recurrence_count_positive;

-- Drop recurrence columns
ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_enabled;

ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_interval;

ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_unit;

ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_end_date;

ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_count_enabled;

ALTER TABLE user_presets
DROP COLUMN IF EXISTS recurrence_count;

-- Done! Recurrence fields have been removed from user_presets table.
