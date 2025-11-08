import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const resolveEnvValue = (value) => {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  // Ignore Expo placeholders like ${EXPO_PUBLIC_*}
  if (/^\$\{.+\}$/.test(trimmed)) return undefined;
  // Strip surrounding quotes that might come from .env parsing
  return trimmed.replace(/^"(.*)"$/, '$1');
};

const SUPABASE_URL =
  resolveEnvValue(Constants.expoConfig?.extra?.supabaseUrl) ||
  resolveEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);

const SUPABASE_ANON_KEY =
  resolveEnvValue(Constants.expoConfig?.extra?.supabaseAnonKey) ||
  resolveEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

