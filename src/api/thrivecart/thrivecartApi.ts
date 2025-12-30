// ThriveCart API utilities
// Webhook endpoints are handled by Supabase Edge Functions:
// - Subscriptions: /functions/v1/thrivecart-webhook
// - Top-ups: /functions/v1/thrivecart-topup

export const THRIVECART_ACCOUNT = 'tinder';

// Product configurations
export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    productId: 7,
    slug: 'cb4-starter',
    tier: 'tier1',
    monthlyCredits: 10000,
    price: 29
  },
  pro: {
    productId: 8,
    slug: 'cb4-pro',
    tier: 'tier2',
    monthlyCredits: 40000,
    price: 99
  }
};

export const TOPUP_PRODUCTS = {
  1000: { productId: 9, slug: 'cb4-credits-1000', credits: 1000, price: 10 },
  2500: { productId: 10, slug: 'cb4-credits-2500', credits: 2500, price: 25 },
  5000: { productId: 12, slug: 'cb4-credits-5000', credits: 5000, price: 50 },
  10000: { productId: 13, slug: 'cb4-credits-10000', credits: 10000, price: 100 }
};

// Generate checkout URL
export function getCheckoutUrl(productSlug: string, email?: string): string {
  let url = `https://${THRIVECART_ACCOUNT}.thrivecart.com/${productSlug}/`;
  if (email) {
    url += `?passthrough[email]=${encodeURIComponent(email)}`;
  }
  return url;
}

// Open checkout in popup
export function openCheckoutPopup(productSlug: string, email?: string): void {
  const url = getCheckoutUrl(productSlug, email);
  const width = 600;
  const height = 700;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  window.open(
    url,
    'thrivecart_checkout',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
}
