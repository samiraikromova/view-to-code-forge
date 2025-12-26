import { createClient } from '@supabase/supabase-js'

// These are public keys - safe to include in frontend
const supabaseUrl = 'https://uabnekabammltaymvsno.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYm5la2FiYW1tbHRheW12c25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjI4MjMsImV4cCI6MjA3NTM5ODgyM30.o-1T3MqJeuIDkAaPiaH134k9Hi4K_gkscLIzpZMHDZw'

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
}
