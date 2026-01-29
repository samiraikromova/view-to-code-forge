import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentTier?: string | null;
}

const PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    credits: 10000,
    internalRef: 'tier1',
    features: [
      '10,000 monthly credits',
      'AI Chat access',
      'Ask AI on lessons',
      'Priority support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 99,
    credits: 40000,
    internalRef: 'tier2',
    features: [
      '40,000 monthly credits',
      'AI Chat access',
      'Ask AI on lessons',
      'Priority support',
      'Advanced AI models',
    ],
  },
};

export function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  currentTier,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState<'starter' | 'pro' | null>(null);

  const handleSubscribe = async (tier: 'starter' | 'pro') => {
    setLoading(tier);
    try {
      const plan = PLANS[tier];
      
      // Build success URL - Fanbases will append payment_intent and redirect_status params
      const successParams = new URLSearchParams();
      successParams.set('product_type', 'subscription');
      successParams.set('internal_reference', plan.internalRef);
      const successUrl = `${window.location.origin}/payment-confirm?${successParams.toString()}`;
      
      // Use fanbases-checkout with existing product ID from fanbases_products
      const { data, error } = await supabase.functions.invoke('fanbases-checkout', {
        body: {
          action: 'create_checkout',
          internal_reference: plan.internalRef, // tier1 or tier2
          success_url: successUrl,
          cancel_url: `${window.location.origin}/settings?subscription=cancelled`,
          base_url: window.location.origin,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error(error.message || 'Failed to create checkout');
        return;
      }

      const checkoutUrl = data?.checkout_url || data?.payment_link;
      if (checkoutUrl) {
        // Redirect to Fanbases checkout
        window.location.href = checkoutUrl;
      } else {
        toast.error('Failed to get checkout link');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="text-xl text-accent">Subscribe to Unlock AI Features</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get access to AI Chat and Ask AI on all your lessons.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {(Object.entries(PLANS) as [('starter' | 'pro'), typeof PLANS.starter][]).map(([tier, plan]) => {
            const isCurrent = currentTier === tier || currentTier === plan.internalRef;
            const isDisabled = loading !== null || isCurrent;
            
            return (
              <div
                key={tier}
                className={`p-4 rounded-lg border ${
                  tier === 'pro' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-surface/30'
                }`}
              >
              {tier === 'pro' && (
                  <div className="text-xs font-medium text-accent mb-2">MOST POPULAR</div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-4 ${tier === 'pro' ? 'bg-accent hover:bg-accent-hover text-accent-foreground' : ''}`}
                  variant={tier === 'pro' ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(tier)}
                  disabled={isDisabled}
                >
                  {loading === tier ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Redirecting...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
