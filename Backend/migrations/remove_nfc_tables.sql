-- =====================================================
-- SQL MIGRATION: Remove NFC-related tables and columns
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Drop RLS policies FIRST (before dropping the table)
DROP POLICY IF EXISTS "Allow public read of valid UIDs" ON valid_scute_uids;
DROP POLICY IF EXISTS "Allow service role to manage valid UIDs" ON valid_scute_uids;

-- 2. Drop the indexes
DROP INDEX IF EXISTS idx_user_cards_uid;
DROP INDEX IF EXISTS idx_valid_uids_uid;

-- 3. Drop the valid_scute_uids table entirely (NFC card whitelist)
DROP TABLE IF EXISTS valid_scute_uids CASCADE;

-- 4. Remove NFC-related columns from user_cards table
ALTER TABLE user_cards
DROP COLUMN IF EXISTS uid,
DROP COLUMN IF EXISTS registered_at;
