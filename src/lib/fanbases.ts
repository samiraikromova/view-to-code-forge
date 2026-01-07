// Fanbases API configuration and types
// Card-on-file payment system for one-click purchases

export const FANBASES_API_URL = 'https://www.fanbasis.com/public-api';

// Product configurations for modules (one-time purchases)
export const MODULE_PRODUCTS = {
  steal_my_script: {
    id: 'steal_my_script',
    name: 'Steal My Script',
    price_cents: 9800, // $98
    module_slug: 'steal-my-script',
  },
  order_bump: {
    id: 'order_bump',
    name: 'Order Bump',
    price_cents: 4900, // $49
    module_slug: 'order-bump',
  },
  outreach_guide: {
    id: 'outreach_guide',
    name: 'Outreach Guide',
    price_cents: 19700, // $197
    module_slug: 'outreach-guide',
  },
  sales_calls: {
    id: 'sales_calls',
    name: 'How to Take Sales Calls',
    price_cents: 19700, // $197
    module_slug: 'how-to-take-sales-calls',
  },
  onboarding_fulfillment: {
    id: 'onboarding_fulfillment',
    name: 'Onboarding & Fulfillment',
    price_cents: 19700, // $197
    module_slug: 'onboarding-fulfillment',
  },
  backend_automation: {
    id: 'backend_automation',
    name: 'Backend Automation & Attribution',
    price_cents: 29700, // $297
    module_slug: 'back-end-automation-tracking-funnels',
  },
} as const;

// Subscription products
export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    id: 'starter_monthly',
    name: 'Starter Plan',
    price_cents: 2900, // $29/month
    tier: 'tier1',
    monthly_credits: 10000,
  },
  pro: {
    id: 'pro_monthly',
    name: 'Pro Plan',
    price_cents: 9900, // $99/month
    tier: 'tier2',
    monthly_credits: 40000,
  },
} as const;

// Credit top-up products
export const TOPUP_PRODUCTS = {
  credits_1000: { id: 'credits_1000', credits: 1000, price_cents: 1000 },
  credits_2500: { id: 'credits_2500', credits: 2500, price_cents: 2500 },
  credits_5000: { id: 'credits_5000', credits: 5000, price_cents: 5000 },
  credits_10000: { id: 'credits_10000', credits: 10000, price_cents: 10000 },
} as const;

// Types for Fanbases API
export interface FanbasesCustomer {
  id: string;
  email: string;
  payment_method_id?: string;
  created_at: string;
}

export interface FanbasesChargeRequest {
  payment_method_id: string;
  amount_cents: number;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface FanbasesChargeResponse {
  status: string;
  message: string;
  data: {
    charge_id: string;
    amount: number;
    status: string;
    created_at: string;
  };
}

// Access types
export type AccessRequirement = 'purchase' | 'subscription' | 'call_booking' | 'free';

export interface ModuleAccess {
  module_id: string;
  has_access: boolean;
  access_type: AccessRequirement;
  price_cents?: number;
}
