/**
 * Supabase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Project Settings > API
 * 4. Copy the "Project URL" and "anon public" key
 * 5. Replace the values below
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
const SUPABASE_URL = 'https://mbrewdmvnadwubhshuav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icmV3ZG12bmFkd3ViaHNodWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDUyMzAsImV4cCI6MjA4MzMyMTIzMH0.fhBN0aEvXVkcPLvDyXCaGJfYS-Eu70kXxwcC2sxaGW8';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('[Supabase] WARNING: You need to configure your Supabase credentials in src/config/supabase.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
  db: {
    schema: 'public',
  },
});

export default supabase;
