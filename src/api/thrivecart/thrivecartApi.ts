// ThriveCart webhook handler service
// For processing payment webhooks

import { supabase } from '@/lib/supabase'
import { addUserToAllowList, removeUserFromAllowList } from '@/lib/allowList'

export interface ThriveCartEvent {
  event: string
  customer: {
    email: string
    name?: string
  }
  order?: {
    id: string
    invoice_id: string
  }
  subscription?: {
    id: string
    status: string
  }
}

export async function handleThriveCartWebhook(payload: ThriveCartEvent): Promise<{ success: boolean; message: string }> {
  const { event, customer } = payload
  const email = customer?.email?.toLowerCase()

  if (!email) {
    return { success: false, message: 'No customer email provided' }
  }

  try {
    switch (event) {
      case 'order.success':
      case 'subscription.started':
        // Add user to allow list on successful payment
        const addSuccess = await addUserToAllowList(email, 'payment_success')
        return { 
          success: addSuccess, 
          message: addSuccess ? 'User added to allow list' : 'Failed to add user' 
        }

      case 'subscription.cancelled':
      case 'subscription.paused':
        // Remove user from allow list when subscription ends
        const removeSuccess = await removeUserFromAllowList(email)
        return { 
          success: removeSuccess, 
          message: removeSuccess ? 'User removed from allow list' : 'Failed to remove user' 
        }

      case 'refund.issued':
        // Remove access on refund
        const refundSuccess = await removeUserFromAllowList(email)
        return { 
          success: refundSuccess, 
          message: refundSuccess ? 'User access revoked due to refund' : 'Failed to revoke access' 
        }

      default:
        return { success: true, message: `Event ${event} acknowledged but not processed` }
    }
  } catch (error) {
    console.error('ThriveCart webhook error:', error)
    return { success: false, message: 'Internal error processing webhook' }
  }
}

export async function handleTopUpWebhook(payload: {
  email: string
  credits: number
  order_id: string
}): Promise<{ success: boolean; message: string }> {
  const { email, credits, order_id } = payload

  if (!email || !credits) {
    return { success: false, message: 'Missing email or credits amount' }
  }

  try {
    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, credits')
      .eq('email', email.toLowerCase())
      .single()

    if (findError || !user) {
      return { success: false, message: 'User not found' }
    }

    // Add credits to user
    const newCredits = (user.credits || 0) + credits
    const { error: updateError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
        last_credit_update: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return { success: false, message: 'Failed to update credits' }
    }

    // Log the top-up
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: credits,
      type: 'top_up',
      order_id,
      created_at: new Date().toISOString()
    })

    return { success: true, message: `Added ${credits} credits to user` }
  } catch (error) {
    console.error('Top-up webhook error:', error)
    return { success: false, message: 'Internal error processing top-up' }
  }
}
