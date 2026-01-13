import { supabase } from '@/lib/supabase'

export async function isUserAllowed(email: string): Promise<boolean> {
  // First check allowed_users table
  const { data: allowedData } = await supabase
    .from('allowed_users')
    .select('email, is_active')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .maybeSingle()

  if (allowedData) return true

  // Also check if user has active subscription or credits in users table
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_tier, credits, trial_ends_at')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (userData) {
    // Allow if user has paid subscription tier
    if (userData.subscription_tier && userData.subscription_tier !== 'free') {
      return true
    }
    // Allow if user has credits
    if (userData.credits && Number(userData.credits) > 0) {
      return true
    }
    // Allow if user is on active trial
    if (userData.trial_ends_at && new Date(userData.trial_ends_at) > new Date()) {
      return true
    }
  }

  return false
}

export async function addUserToAllowList(email: string, reason: string = 'payment_success') {
  const { error } = await supabase
    .from('allowed_users')
    .upsert({
      email,
      is_active: true,
      reason,
      updated_at: new Date().toISOString()
    })

  return !error
}

export async function removeUserFromAllowList(email: string) {
  const { error } = await supabase
    .from('allowed_users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('email', email)

  return !error
}
