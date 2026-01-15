-- Migration: Add recurrence fields to user_presets table
-- Run this SQL in your Supabase SQL editor to add recurring schedule support

-- Add recurrence_enabled column (boolean, default false)
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_enabled BOOLEAN DEFAULT FALSE;

-- Add recurrence_interval column (integer, e.g., 3 for "every 3 hours")
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT NULL;

-- Add recurrence_unit column (text: 'hourly', 'daily', 'weekly', 'monthly')
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_unit TEXT DEFAULT NULL;

-- Add recurrence_end_date column (timestamp, when the recurrence stops - optional)
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ DEFAULT NULL;

-- Add check constraint for recurrence_unit values
ALTER TABLE user_presets
ADD CONSTRAINT IF NOT EXISTS check_recurrence_unit
CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('hourly', 'daily', 'weekly', 'monthly'));

-- Add check constraint for positive recurrence_interval
ALTER TABLE user_presets
ADD CONSTRAINT IF NOT EXISTS check_recurrence_interval_positive
CHECK (recurrence_interval IS NULL OR recurrence_interval > 0);

-- Create index for querying recurring presets efficiently
CREATE INDEX IF NOT EXISTS idx_user_presets_recurrence
ON user_presets (email, is_scheduled, recurrence_enabled)
WHERE is_scheduled = TRUE AND recurrence_enabled = TRUE;

-- Comment on columns for documentation
COMMENT ON COLUMN user_presets.recurrence_enabled IS 'Whether this scheduled preset repeats at intervals';
COMMENT ON COLUMN user_presets.recurrence_interval IS 'Number of units between recurrences (e.g., 3 for "every 3 hours")';
COMMENT ON COLUMN user_presets.recurrence_unit IS 'Unit of time for recurrence: hourly, daily, weekly, or monthly';
COMMENT ON COLUMN user_presets.recurrence_end_date IS 'Optional date when the recurrence stops (null = repeats indefinitely)';
