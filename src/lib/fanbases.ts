// Fanbases API configuration and types
// Card-on-file payment system for one-click purchases
//
// NOTE: These are FALLBACK definitions. The authoritative product mappings
// are stored in the `fanbases_products` Supabase table.
// The table maps Fanbases product IDs to internal references.
// SANDBOX (for testing):
//export const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";
// PRODUCTION (for live):
export const FANBASES_API_URL = "https://www.fanbasis.com/public-api";

// Product configurations for modules (one-time purchases)
// internal_reference values match what's stored in fanbases_products table
export const MODULE_PRODUCTS = {
  steal_my_script: {
    id: "steal-my-script", // internal_reference
    name: "Steal My Script",
    price_cents: 9800, // $98
    module_slug: "steal-my-script",
  },
  bump_offer: {
    id: "bump-offer", // internal_reference
    name: "Bump Offer",
    price_cents: 4900, // $49
    module_slug: "bump-offer",
  },
  outreach_guide: {
    id: "outreach-guide", // internal_reference
    name: "Outreach Guide",
    price_cents: 19700, // $197
    module_slug: "outreach-guide",
  },
  sales_calls: {
    id: "sales-calls", // internal_reference
    name: "How to Take Sales Calls",
    price_cents: 19700, // $197
    module_slug: "sales-calls",
  },
  onboarding_fulfillment: {
    id: "onboarding-and-fulfillment", // internal_reference
    name: "Onboarding & Fulfillment",
    price_cents: 19700, // $197
    module_slug: "onboarding-and-fulfillment",
  },
  automation: {
    id: "automation", // internal_reference
    name: "Backend Automation & Attribution",
    price_cents: 29700, // $297
    module_slug: "automation",
  },
} as const;

// Subscription products - internal_reference values: tier1, tier2
export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    id: "tier1", // internal_reference in fanbases_products
    name: "Starter Plan",
    price_cents: 2900, // $29/month
    tier: "tier1",
    monthly_credits: 10000,
  },
  pro: {
    id: "tier2", // internal_reference in fanbases_products
    name: "Pro Plan",
    price_cents: 9900, // $99/month
    tier: "tier2",
    monthly_credits: 40000,
  },
} as const;

// Credit top-up products - internal_reference format: X_credits
export const TOPUP_PRODUCTS = {
  credits_1000: { id: "1000_credits", credits: 1000, price_cents: 1000 },
  credits_2500: { id: "2500_credits", credits: 2500, price_cents: 2500 },
  credits_5000: { id: "5000_credits", credits: 5000, price_cents: 5000 },
  credits_10000: { id: "10000_credits", credits: 10000, price_cents: 10000 },
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
export type AccessRequirement = "purchase" | "subscription" | "call_booking" | "free";

export interface ModuleAccess {
  module_id: string;
  has_access: boolean;
  access_type: AccessRequirement;
  price_cents?: number;
}
