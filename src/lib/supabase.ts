import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
  starred?: boolean
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
  name: string | null
  email: string | null
  credits: number
  subscription_tier: string
  created_at?: string
  total_tokens?: number
  total_cost?: number
  last_credit_update?: string
  business_name?: string | null
  address?: string | null
  trial_started_at?: string | null
  trial_ends_at?: string | null
  trial_credits_revoked?: boolean
}
