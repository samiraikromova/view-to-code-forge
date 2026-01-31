// Fanbases API client
// Handles customer creation, card storage, and charging via Supabase edge functions

import { supabase } from '@/lib/supabase';

export interface ChargeResult {
  success: boolean;
  charge_id?: string;
  error?: string;
}

export interface CustomerResult {
  success: boolean;
  customer_id?: string;
  has_payment_method: boolean;
  error?: string;
}

/**
 * Get or create a Fanbases customer for the current user
 */
export async function getOrCreateCustomer(): Promise<CustomerResult> {
  const { data, error } = await supabase.functions.invoke('fanbases-customer', {
    body: { action: 'get_or_create' },
  });

  if (error) {
    console.error('Error getting/creating customer:', error);
    return { success: false, has_payment_method: false, error: error.message };
  }

  return {
    success: true,
    customer_id: data.customer_id,
    has_payment_method: data.has_payment_method,
  };
}

/**
 * Add a payment method for the current user
 * This will redirect to Fanbases checkout to collect card details
 * Uses fanbases-checkout with action: "setup_card" as per Fanbasis API requirements
 */
export async function setupPaymentMethod(): Promise<{ success: boolean; checkout_url?: string; checkout_session_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('fanbases-checkout', {
    body: { 
      action: 'setup_card',
      base_url: window.location.origin,
      // Redirect to payment-confirm page (same as other payment types)
      success_url: `${window.location.origin}/payment-confirm`,
      cancel_url: `${window.location.origin}/settings?setup=cancelled`,
    },
  });

  if (error) {
    console.error('Error setting up payment method:', error);
    return { success: false, error: error.message };
  }

  // Edge function returns payment_link
  return {
    success: true,
    checkout_url: data.payment_link || data.checkout_url,
    checkout_session_id: data.checkout_session_id,
    error: data.error,
  };
}

/**
 * Fetch payment methods for the current user
 * Call this after returning from checkout to sync payment methods
 */
export async function fetchPaymentMethods(paymentId?: string, email?: string): Promise<{
  success: boolean;
  customer_id?: string;
  payment_methods?: Array<{ id: string; type: string; last4?: string; brand?: string; exp_month?: number; exp_year?: number; is_default?: boolean }>;
  has_payment_method: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('fanbases-customer', {
    body: { action: 'fetch_payment_methods', payment_id: paymentId, email },
  });

  if (error) {
    console.error('Error fetching payment methods:', error);
    return { success: false, has_payment_method: false, error: error.message };
  }

  return {
    success: true,
    customer_id: data.customer_id,
    payment_methods: data.payment_methods,
    has_payment_method: data.has_payment_method,
  };
}

/**
 * Charge the current user for a product purchase using internal_reference
 * This uses the pre-defined products in fanbases_products table
 */
export async function chargeCustomer(
  internal_reference: string
): Promise<ChargeResult> {
  const { data, error } = await supabase.functions.invoke('fanbases-charge', {
    body: {
      internal_reference,
    },
  });

  if (error) {
    console.error('Error charging customer:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    // Check if we need to redirect to checkout
    if (data.needs_checkout || data.redirect_to_checkout) {
      return { 
        success: false, 
        error: data.error || 'Payment method not available',
      };
    }
    return { success: false, error: data.error || 'Charge failed' };
  }

  return {
    success: true,
    charge_id: data.charge_id,
  };
}

/**
 * Purchase a module (one-time payment)
 * Uses the internal_reference from fanbases_products table
 */
export async function purchaseModule(moduleSlug: string): Promise<ChargeResult> {
  return chargeCustomer(moduleSlug);
}

/**
 * Start or change subscription
 * Uses internal_reference: tier1 or tier2
 */
export async function startSubscription(tier: 'starter' | 'pro'): Promise<ChargeResult> {
  const tierMapping = { starter: 'tier1', pro: 'tier2' };
  return chargeCustomer(tierMapping[tier]);
}

/**
 * Purchase credits top-up
 * Uses internal_reference format: 1000_credits, 2500_credits, etc.
 */
export async function purchaseCredits(credits: number): Promise<ChargeResult> {
  return chargeCustomer(`${credits}_credits`);
}

/**
 * Check if user has access to a specific module
 * Uses checkout_sessions table with status='completed' and product_type='module'
 */
export async function checkModuleAccess(moduleSlug: string): Promise<{ has_access: boolean; access_type?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { has_access: false };

  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', moduleSlug)
    .eq('product_type', 'module')
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Error checking module access:', error);
    return { has_access: false };
  }

  return { has_access: !!data, access_type: data ? 'purchase' : undefined };
}

/**
 * Get all user's purchased modules from checkout_sessions
 */
export async function getUserPurchases(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('product_type', 'module')
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching user purchases:', error);
    return [];
  }

  return data?.map(p => p.product_id).filter(Boolean) as string[] || [];
}

/**
 * Check if user has an active subscription
 */
export async function checkSubscriptionStatus(): Promise<{ is_active: boolean; tier?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { is_active: false };

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error checking subscription:', error);
    return { is_active: false };
  }

  return { is_active: !!data, tier: data?.tier };
}

/**
 * Confirm a payment after redirect from Fanbases
 * This grants access based on the payment details
 */
export async function confirmPayment(params: {
  payment_intent: string;
  redirect_status: string;
  product_type: string;
  internal_reference: string;
  fanbases_product_id?: string;
}): Promise<{ success: boolean; message?: string; already_processed?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('fanbases-confirm-payment', {
    body: params,
  });

  if (error) {
    console.error('Error confirming payment:', error);
    return { success: false, error: error.message };
  }

  return data;
}
