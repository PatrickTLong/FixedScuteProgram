-- Migration: Add custom_redirect_url field to user_presets table
-- Run this SQL in your Supabase SQL editor to add custom redirect URL support
-- When set, blocked websites will redirect to this URL instead of google.com

-- Add custom_redirect_url column (text, default empty string)
ALTER TABLE user_presets
ADD COLUMN IF NOT EXISTS custom_redirect_url TEXT DEFAULT '';

-- Comment on column for documentation
COMMENT ON COLUMN user_presets.custom_redirect_url IS 'Custom URL to redirect to when a blocked website is detected (empty = default google.com)';
