// Access control hook for managing user permissions
// Handles module access, subscription status, trial, and dashboard access

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface AccessState {
  // Module access
  purchasedModules: string[];
  
  // Subscription
  hasActiveSubscription: boolean;
  subscriptionTier: string | null;
  
  // Trial
  isOnTrial: boolean;
  trialEndsAt: Date | null;
  trialExpired: boolean;
  trialDaysRemaining: number;
  
  // Dashboard
  hasDashboardAccess: boolean;
  
  // Chat/AI
  hasChatAccess: boolean;
  
  // Products from fanbases_products table
  fanbasesProducts: FanbasesProduct[];
  
  // Loading
  loading: boolean;
}

export interface FanbasesProduct {
  fanbases_product_id: string;
  product_type: string;
  internal_reference: string;
  price_cents?: number;
}

export interface ModuleAccessInfo {
  hasAccess: boolean;
  requiresCall: boolean;
  bookingUrl?: string;
  price?: number;
  productId?: string;
  fanbasesProductId?: string;
  fanbasesCheckoutUrl?: string;
}

// Modules that require booking a call (cannot be purchased)
const CALL_REQUIRED_MODULES = [
  'call-recordings',
  'coaching-content',
];

export function useAccess() {
  const { user, profile } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>({
    purchasedModules: [],
    hasActiveSubscription: false,
    subscriptionTier: null,
    isOnTrial: false,
    trialEndsAt: null,
    trialExpired: false,
    trialDaysRemaining: 0,
    hasDashboardAccess: false,
    hasChatAccess: false,
    fanbasesProducts: [],
    loading: true,
  });

  // Load user access data
  const loadAccessData = useCallback(async () => {
    if (!user) {
      setAccessState({
        purchasedModules: [],
        hasActiveSubscription: false,
        subscriptionTier: null,
        isOnTrial: false,
        trialEndsAt: null,
        trialExpired: false,
        trialDaysRemaining: 0,
        hasDashboardAccess: false,
        hasChatAccess: false,
        fanbasesProducts: [],
        loading: false,
      });
      return;
    }

    try {
      // Fetch all data in parallel
      const [userDataResult, purchasesResult, subscriptionResult, dashboardAccessResult, fanbasesProductsResult] = await Promise.all([
        // User data for trial info
        supabase
          .from('users')
          .select('trial_started_at, trial_ends_at, subscription_tier')
          .eq('id', user.id)
          .single(),
        // Purchases
        supabase
          .from('user_purchases')
          .select('product_id')
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        // Subscription
        supabase
          .from('user_subscriptions')
          .select('tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        // Dashboard access
        supabase
          .from('user_special_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('access_type', 'dashboard')
          .maybeSingle(),
        // Fanbases products for pricing
        supabase
          .from('fanbases_products')
          .select('fanbases_product_id, product_type, internal_reference')
      ]);

      const userData = userDataResult.data;
      
      // Calculate trial status
      let isOnTrial = false;
      let trialEndsAt: Date | null = null;
      let trialExpired = false;
      let trialDaysRemaining = 0;

      if (userData?.trial_ends_at) {
        trialEndsAt = new Date(userData.trial_ends_at);
        const now = new Date();
        
        if (userData.trial_started_at && trialEndsAt > now) {
          isOnTrial = true;
          trialDaysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        } else if (userData.trial_started_at) {
          trialExpired = true;
        }
      }

      const purchasedModules = purchasesResult.data?.map(p => p.product_id) || [];
      
      // Check subscription from user_subscriptions OR users.subscription_tier
      const subscriptionTier = subscriptionResult.data?.tier || userData?.subscription_tier || 'free';
      const hasActiveSubscription = !!subscriptionResult.data || 
        (subscriptionTier && subscriptionTier !== 'free' && subscriptionTier !== 'trial');
      
      const hasDashboardAccess = !!dashboardAccessResult.data;
      const hasChatAccess = hasActiveSubscription || isOnTrial;
      const fanbasesProducts = fanbasesProductsResult.data || [];

      setAccessState({
        purchasedModules,
        hasActiveSubscription,
        subscriptionTier,
        isOnTrial,
        trialEndsAt,
        trialExpired,
        trialDaysRemaining,
        hasDashboardAccess,
        hasChatAccess,
        fanbasesProducts,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading access data:', error);
      setAccessState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    loadAccessData();
  }, [loadAccessData]);

  // Check if user has access to a specific module based on its access_type
  const checkModuleAccess = useCallback((moduleSlug: string, accessType?: string, productId?: string): ModuleAccessInfo => {
    // PRIORITY 1: Check access_type from database FIRST
    // If access_type is 'free', module is always accessible (regardless of module name)
    if (accessType === 'free') {
      return { hasAccess: true, requiresCall: false };
    }

    // If access_type is 'book_a_call', require a call
    if (accessType === 'book_a_call') {
      return {
        hasAccess: accessState.hasDashboardAccess,
        requiresCall: true,
      };
    }

    // If access_type is 'tier_required', check subscription
    if (accessType === 'tier_required') {
      return {
        hasAccess: accessState.hasActiveSubscription,
        requiresCall: false,
      };
    }

    // If access_type is 'purchase_required', check if purchased
    if (accessType === 'purchase_required') {
      // Check if user has purchased this module
      const hasPurchased = accessState.purchasedModules.includes(moduleSlug) || 
                           (productId && accessState.purchasedModules.includes(productId));
      
      if (hasPurchased) {
        return { hasAccess: true, requiresCall: false };
      }

      // Find product in fanbases_products for checkout link
      const product = accessState.fanbasesProducts.find(p => 
        p.internal_reference === moduleSlug || p.internal_reference === productId
      );

      return {
        hasAccess: false,
        requiresCall: false,
        productId: productId || moduleSlug,
        fanbasesProductId: product?.fanbases_product_id,
        fanbasesCheckoutUrl: product ? `https://www.fanbasis.com/agency-checkout/leveragedcreator/${product.fanbases_product_id}` : undefined,
      };
    }

    // PRIORITY 2: Fallback pattern matching (only if no accessType provided)
    // Call-required modules (call recordings) - require call booking
    if (!accessType && (CALL_REQUIRED_MODULES.includes(moduleSlug) || moduleSlug.includes('call-recording'))) {
      return {
        hasAccess: accessState.hasDashboardAccess,
        requiresCall: true,
      };
    }

    // PRIORITY 3: Default - check if purchased (backward compatibility)
    if (accessState.purchasedModules.includes(moduleSlug)) {
      return { hasAccess: true, requiresCall: false };
    }

    // No accessType and not purchased - check fanbases for purchase option
    const product = accessState.fanbasesProducts.find(p => 
      p.internal_reference === moduleSlug || p.internal_reference === productId
    );

    // If no product found and no accessType, default to free
    if (!product && !accessType) {
      return { hasAccess: true, requiresCall: false };
    }

    return {
      hasAccess: false,
      requiresCall: false,
      productId: productId || moduleSlug,
      fanbasesProductId: product?.fanbases_product_id,
      fanbasesCheckoutUrl: product ? `https://www.fanbasis.com/agency-checkout/leveragedcreator/${product.fanbases_product_id}` : undefined,
    };
  }, [accessState.purchasedModules, accessState.hasDashboardAccess, accessState.hasActiveSubscription, accessState.fanbasesProducts]);

  // Check if Ask AI is available (requires subscription or trial)
  const canAskAI = useCallback(() => {
    return accessState.hasChatAccess;
  }, [accessState.hasChatAccess]);

  // Check if user needs to start trial (no trial, no subscription)
  const needsTrial = useCallback(() => {
    return !accessState.hasActiveSubscription && !accessState.isOnTrial && !accessState.trialExpired;
  }, [accessState.hasActiveSubscription, accessState.isOnTrial, accessState.trialExpired]);

  // Check if user needs to subscribe (trial expired or no access)
  const needsSubscription = useCallback(() => {
    return accessState.trialExpired && !accessState.hasActiveSubscription;
  }, [accessState.trialExpired, accessState.hasActiveSubscription]);

  // Refresh access data
  const refreshAccess = useCallback(() => {
    return loadAccessData();
  }, [loadAccessData]);

  return {
    ...accessState,
    checkModuleAccess,
    canAskAI,
    needsTrial,
    needsSubscription,
    refreshAccess,
  };
}
