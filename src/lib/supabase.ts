import { createClient } from '@supabase/supabase-js'

// These are public keys - safe to include in frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  thread_id: string
  model?: string
  tokens_used?: number
}

export type ChatThread = {
  id: string
  title: string
  created_at: string
  updated_at?: string
  user_id: string
  project_id: string
  model?: string
}

export type Project = {
  id: string
  name: string
  slug: string
  emoji?: string
  description?: string
  system_prompt?: string
  is_premium?: boolean
}

export type UserProfile = {
  id: string
  credits: number
  subscription_tier: 'free' | 'starter' | 'pro'
  email?: string
  full_name?: string
}
