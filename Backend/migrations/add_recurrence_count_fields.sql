-- Migration: Add recurrence count fields and minutely support to user_presets table
-- Run this SQL in your Supabase SQL editor

-- Add recurrence_count_enabled column (boolean, default false)
-- When true, recurrence is limited by count instead of date
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_count_enabled BOOLEAN DEFAULT FALSE;

-- Add recurrence_count column (integer, number of times to recur)
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER DEFAULT NULL;

-- Drop the old constraint if it exists (to update it with 'minutely')
ALTER TABLE user_presets
DROP CONSTRAINT IF EXISTS check_recurrence_unit;

-- Re-add constraint with 'minutely' included
ALTER TABLE user_presets
ADD CONSTRAINT check_recurrence_unit
CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('minutely', 'hourly', 'daily', 'weekly', 'monthly'));

-- Add check constraint for positive recurrence_count
ALTER TABLE user_presets
ADD CONSTRAINT check_recurrence_count_positive
CHECK (recurrence_count IS NULL OR recurrence_count > 0);

-- Comment on new columns for documentation
COMMENT ON COLUMN user_presets.recurrence_count_enabled IS 'Whether recurrence is limited by count (true) or runs forever (false)';
COMMENT ON COLUMN user_presets.recurrence_count IS 'Number of times to recur before stopping (only used if recurrence_count_enabled is true)';
