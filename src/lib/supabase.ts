import { createClient } from '@supabase/supabase-js';

// Environment variables - you'll need to add these to your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserProfile = {
  id: string;
  email: string;
  subscription_tier: 'free' | 'starter' | 'pro';
  credits: number;
  created_at: string;
};
