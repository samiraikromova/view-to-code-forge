export type SubscriptionTier = "free" | "starter" | "pro";

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
}

export const PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: "free",
    name: "Free",
    price: 0,
    features: [
      "Basic tools access",
      "5 chats per day",
      "Community support"
    ]
  },
  starter: {
    tier: "starter",
    name: "Starter",
    price: 29,
    features: [
      "10,000 monthly credits",
      "AI Chat access",
      "Ask AI on lessons",
      "Priority support"
    ]
  },
  pro: {
    tier: "pro",
    name: "Pro",
    price: 99,
    features: [
      "40,000 monthly credits",
      "AI Chat access",
      "Ask AI on lessons",
      "Priority support",
      "Advanced AI models"
    ]
  }
};
