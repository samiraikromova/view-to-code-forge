import { supabase } from '@/lib/supabase'

export async function isAdminEmail(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single()

  return !!data
}
