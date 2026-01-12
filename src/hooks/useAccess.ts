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
  
  // Loading
  loading: boolean;
}

export interface ModuleAccessInfo {
  hasAccess: boolean;
  requiresCall: boolean;
  price?: number;
  productId?: string;
  fanbasesProductId?: string;
}

// Modules that require booking a call (cannot be purchased)
const CALL_REQUIRED_MODULES = [
  'call-recordings',
  'coaching-content',
];

// Module pricing map - matches internal_reference values in fanbases_products
const MODULE_PRICES: Record<string, number> = {
  'steal-my-script': 98,
  'bump-offer': 49,
  'outreach-guide': 197,
  'sales-calls': 197,
  'onboarding-and-fulfillment': 197,
  'automation': 297,
};

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
        loading: false,
      });
      return;
    }

    try {
      // Fetch user data for trial info
      const { data: userData } = await supabase
        .from('users')
        .select('trial_started_at, trial_ends_at, subscription_tier')
        .eq('id', user.id)
        .single();

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

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('user_purchases')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const purchasedModules = purchases?.map(p => p.product_id) || [];

      // Fetch subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('tier, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const hasActiveSubscription = !!subscription;
      const subscriptionTier = subscription?.tier || userData?.subscription_tier || null;

      // Check dashboard access (requires call booking)
      const { data: dashboardAccess } = await supabase
        .from('user_special_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('access_type', 'dashboard')
        .maybeSingle();

      const hasDashboardAccess = !!dashboardAccess;

      // Chat access requires subscription OR active trial
      const hasChatAccess = hasActiveSubscription || isOnTrial;

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

  // Check if user has access to a specific module
  const checkModuleAccess = useCallback((moduleSlug: string): ModuleAccessInfo => {
    // Call-required modules (call recordings)
    if (CALL_REQUIRED_MODULES.includes(moduleSlug) || moduleSlug.includes('call-recording') || moduleSlug.includes('recording')) {
      return {
        hasAccess: accessState.hasDashboardAccess, // Dashboard access means they booked a call
        requiresCall: true,
      };
    }

    // Check if purchased
    if (accessState.purchasedModules.includes(moduleSlug)) {
      return { hasAccess: true, requiresCall: false };
    }

    // Return locked with price
    return {
      hasAccess: false,
      requiresCall: false,
      price: MODULE_PRICES[moduleSlug],
      productId: moduleSlug,
    };
  }, [accessState.purchasedModules, accessState.hasDashboardAccess]);

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
