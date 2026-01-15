-- =====================================================
-- SUPABASE DATABASE SCHEMA FOR SCUTE APP
-- =====================================================
-- Run this SQL in your Supabase SQL Editor:
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file and click "Run"
-- =====================================================

-- Table 1: valid_scute_uids
-- Stores all valid Scute card UIDs (added by admin before shipping)
CREATE TABLE IF NOT EXISTS valid_scute_uids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT -- admin email who added this UID
);

-- Table 2: users
-- Stores user accounts (created when they register with email)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: user_cards
-- Links users to their registered Scute cards
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE REFERENCES users(email) ON DELETE CASCADE,
  uid TEXT UNIQUE, -- NULL until card is registered, UNIQUE ensures no duplicate registrations
  settings JSONB, -- NULL until configured
  registered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: verification_codes
-- Temporary storage for email verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_valid_uids_uid ON valid_scute_uids(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_cards_email ON user_cards(email);
CREATE INDEX IF NOT EXISTS idx_user_cards_uid ON user_cards(uid);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE valid_scute_uids ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read valid_scute_uids (to check if a card is valid)
CREATE POLICY "Allow public read of valid UIDs"
  ON valid_scute_uids FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update/delete valid_scute_uids
-- (Admin operations go through backend with service role key)
CREATE POLICY "Allow service role to manage valid UIDs"
  ON valid_scute_uids FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (true); -- We handle auth in backend

-- Policy: Service role can manage users
CREATE POLICY "Service role manages users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Anyone can read user_cards (to check registration)
CREATE POLICY "Allow public read of user cards"
  ON user_cards FOR SELECT
  USING (true);

-- Policy: Service role can manage user_cards
CREATE POLICY "Service role manages user cards"
  ON user_cards FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Service role manages verification codes
CREATE POLICY "Service role manages verification codes"
  ON verification_codes FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_cards_updated_at
  BEFORE UPDATE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired verification codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
