import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Check, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { startSubscription, getOrCreateCustomer, setupPaymentMethod } from '@/api/fanbases/fanbasesApi';
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
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [settingUpCard, setSettingUpCard] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkPaymentMethod();
    }
  }, [isOpen]);

  const checkPaymentMethod = async () => {
    setCheckingPayment(true);
    try {
      const result = await getOrCreateCustomer();
      setHasPaymentMethod(result.has_payment_method);
    } catch (error) {
      console.error('Error checking payment method:', error);
      setHasPaymentMethod(false);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleAddCard = async () => {
    setSettingUpCard(true);
    try {
      const result = await setupPaymentMethod();
      if (result.success && result.checkout_url) {
        window.open(result.checkout_url, '_blank');
        toast.info('Complete the payment in the new tab, then return here');
      } else {
        toast.error(result.error || 'Failed to set up payment method');
      }
    } catch (error) {
      console.error('Error setting up card:', error);
      toast.error('Failed to set up payment method');
    } finally {
      setSettingUpCard(false);
    }
  };

  const handleSubscribe = async (tier: 'starter' | 'pro') => {
    setLoading(tier);
    try {
      const result = await startSubscription(tier);

      if (result.success) {
        toast.success(`${PLANS[tier].name} plan activated!`);
        onSuccess?.();
        onClose();
      } else {
        // Check if it's a payment method error
        if (result.error?.toLowerCase().includes('no payment method')) {
          setHasPaymentMethod(false);
          toast.error('Please add a payment method first');
        } else {
          toast.error(result.error || 'Subscription failed');
        }
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

        {/* Payment Method Warning */}
        {checkingPayment ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking payment method...</span>
          </div>
        ) : hasPaymentMethod === false ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Payment method required</p>
              <p className="text-sm text-muted-foreground">Please add a card to subscribe</p>
            </div>
            <Button
              size="sm"
              onClick={handleAddCard}
              disabled={settingUpCard}
              className="gap-2 bg-accent hover:bg-accent-hover text-accent-foreground"
            >
              {settingUpCard ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Add Card
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {(Object.entries(PLANS) as [('starter' | 'pro'), typeof PLANS.starter][]).map(([tier, plan]) => {
            const isCurrent = currentTier === tier || currentTier === (tier === 'starter' ? 'tier1' : 'tier2');
            const isDisabled = loading !== null || isCurrent || hasPaymentMethod !== true;
            
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
                      Processing...
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
