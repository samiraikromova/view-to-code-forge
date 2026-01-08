import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Check, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { purchaseCredits, getOrCreateCustomer, setupPaymentMethod } from '@/api/fanbases/fanbasesApi';
import { toast } from 'sonner';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentCredits?: number;
}

const TOPUP_OPTIONS = [
  { credits: 1000, price: 10, perCredit: 0.01 },
  { credits: 2500, price: 25, perCredit: 0.01, popular: false },
  { credits: 5000, price: 50, perCredit: 0.01, popular: true },
  { credits: 10000, price: 100, perCredit: 0.01 },
];

export function TopUpModal({
  isOpen,
  onClose,
  onSuccess,
  currentCredits = 0,
}: TopUpModalProps) {
  const [loading, setLoading] = useState<number | null>(null);
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

  const handlePurchase = async (credits: number, priceCents: number) => {
    setLoading(credits);
    try {
      const result = await purchaseCredits(credits, priceCents);

      if (result.success) {
        toast.success(`${credits.toLocaleString()} credits added!`);
        onSuccess?.();
        onClose();
      } else {
        // Check if it's a payment method error
        if (result.error?.toLowerCase().includes('no payment method')) {
          setHasPaymentMethod(false);
          toast.error('Please add a payment method first');
        } else {
          toast.error(result.error || 'Purchase failed');
        }
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <DialogTitle className="text-xl text-accent">Top Up Credits</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Current balance: <strong>{currentCredits.toFixed(2)} credits</strong>
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
              <p className="text-sm font-medium text-foreground">No payment method on file</p>
              <p className="text-sm text-muted-foreground">Add a card to purchase credits</p>
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

        <div className="grid grid-cols-2 gap-3 py-4">
          {TOPUP_OPTIONS.map((option) => {
            const isDisabled = loading !== null || hasPaymentMethod !== true;
            
            return (
              <div
                key={option.credits}
                className={`relative p-4 rounded-lg border ${
                  option.popular 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-surface/30'
                }`}
              >
                {option.popular && (
                  <div className="absolute -top-2 right-2 bg-accent text-accent-foreground text-xs font-medium px-2 py-0.5 rounded">
                    Popular
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-foreground">
                    {option.credits.toLocaleString()} Credits
                  </span>
                </div>
                
                <div className="text-2xl font-bold text-foreground mb-3">
                  ${option.price}
                </div>

                <Button
                  className={`w-full ${option.popular ? 'bg-accent hover:bg-accent-hover text-accent-foreground' : ''}`}
                  variant={option.popular ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePurchase(option.credits, option.price * 100)}
                  disabled={isDisabled}
                >
                  {loading === option.credits ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Purchase'
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <CreditCard className="h-4 w-4" />
          Charged instantly to your card on file
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
