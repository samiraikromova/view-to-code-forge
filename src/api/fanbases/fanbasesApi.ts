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
 */
export async function setupPaymentMethod(): Promise<{ success: boolean; checkout_url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('fanbases-customer', {
    body: { action: 'setup_payment_method' },
  });

  if (error) {
    console.error('Error setting up payment method:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    checkout_url: data.checkout_url,
  };
}

/**
 * Fetch payment methods for the current user
 * Call this after returning from checkout to sync payment methods
 */
export async function fetchPaymentMethods(checkoutSessionId?: string): Promise<{
  success: boolean;
  customer_id?: string;
  payment_methods?: Array<{ id: string; type: string; last4?: string; brand?: string }>;
  has_payment_method: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('fanbases-customer', {
    body: { action: 'fetch_payment_methods', checkout_session_id: checkoutSessionId },
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
 * Charge the current user for a product purchase
 */
export async function chargeCustomer(
  product_type: 'module' | 'subscription' | 'topup',
  product_id: string,
  amount_cents: number,
  description: string
): Promise<ChargeResult> {
  const { data, error } = await supabase.functions.invoke('fanbases-charge', {
    body: {
      product_type,
      product_id,
      amount_cents,
      description,
    },
  });

  if (error) {
    console.error('Error charging customer:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'Charge failed' };
  }

  return {
    success: true,
    charge_id: data.charge_id,
  };
}

/**
 * Purchase a module (one-time payment)
 */
export async function purchaseModule(moduleId: string, priceCents: number, moduleName: string): Promise<ChargeResult> {
  return chargeCustomer('module', moduleId, priceCents, `Module: ${moduleName}`);
}

/**
 * Start or change subscription
 * Uses internal_reference: tier1 or tier2
 */
export async function startSubscription(tier: 'starter' | 'pro'): Promise<ChargeResult> {
  const prices = { starter: 2900, pro: 9900 };
  // Map to internal_reference used in fanbases_products table
  const tierMapping = { starter: 'tier1', pro: 'tier2' };
  return chargeCustomer('subscription', tierMapping[tier], prices[tier], `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Subscription`);
}

/**
 * Purchase credits top-up
 */
export async function purchaseCredits(credits: number, priceCents: number): Promise<ChargeResult> {
  return chargeCustomer('topup', `credits_${credits}`, priceCents, `${credits.toLocaleString()} Credits Top-up`);
}

/**
 * Check if user has access to a specific module
 */
export async function checkModuleAccess(moduleSlug: string): Promise<{ has_access: boolean; access_type?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { has_access: false };

  const { data, error } = await supabase
    .from('user_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', moduleSlug)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Error checking module access:', error);
    return { has_access: false };
  }

  return { has_access: !!data, access_type: data ? 'purchase' : undefined };
}

/**
 * Get all user's purchased modules
 */
export async function getUserPurchases(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_purchases')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching user purchases:', error);
    return [];
  }

  return data?.map(p => p.product_id) || [];
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
