// Access control hook for managing user permissions
// Handles module access, subscription status, and dashboard access

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface AccessState {
  // Module access
  purchasedModules: string[];
  
  // Subscription
  hasActiveSubscription: boolean;
  subscriptionTier: string | null;
  
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
}

// Modules that require booking a call (cannot be purchased)
const CALL_REQUIRED_MODULES = [
  'call-recordings',
  'coaching-content',
];

// Module pricing map
const MODULE_PRICES: Record<string, number> = {
  'steal-my-script': 98,
  'order-bump': 49,
  'outreach-guide': 197,
  'how-to-take-sales-calls': 197,
  'onboarding-fulfillment': 197,
  'back-end-automation-tracking-funnels': 297,
};

export function useAccess() {
  const { user, profile } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>({
    purchasedModules: [],
    hasActiveSubscription: false,
    subscriptionTier: null,
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
        hasDashboardAccess: false,
        hasChatAccess: false,
        loading: false,
      });
      return;
    }

    try {
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
      const subscriptionTier = subscription?.tier || null;

      // Check dashboard access (requires call booking)
      const { data: dashboardAccess } = await supabase
        .from('user_special_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('access_type', 'dashboard')
        .maybeSingle();

      const hasDashboardAccess = !!dashboardAccess;

      // Chat access requires subscription
      const hasChatAccess = hasActiveSubscription;

      setAccessState({
        purchasedModules,
        hasActiveSubscription,
        subscriptionTier,
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
    // Call-required modules
    if (CALL_REQUIRED_MODULES.includes(moduleSlug)) {
      return {
        hasAccess: accessState.purchasedModules.includes(moduleSlug),
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
  }, [accessState.purchasedModules]);

  // Check if Ask AI is available (requires subscription)
  const canAskAI = useCallback(() => {
    return accessState.hasChatAccess;
  }, [accessState.hasChatAccess]);

  // Refresh access data
  const refreshAccess = useCallback(() => {
    return loadAccessData();
  }, [loadAccessData]);

  return {
    ...accessState,
    checkModuleAccess,
    canAskAI,
    refreshAccess,
  };
}
