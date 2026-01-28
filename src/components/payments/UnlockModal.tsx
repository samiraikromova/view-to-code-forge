import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { purchaseModule } from '@/api/fanbases/fanbasesApi';
import { MODULE_PRODUCTS } from '@/lib/fanbases';
import { toast } from 'sonner';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleSlug: string;
  moduleName: string;
  onSuccess?: () => void;
  requiresCall?: boolean;
}

export function UnlockModal({
  isOpen,
  onClose,
  moduleSlug,
  moduleName,
  onSuccess,
  requiresCall = false,
}: UnlockModalProps) {
  const [loading, setLoading] = useState(false);

  // Find product info
  const productEntry = Object.entries(MODULE_PRODUCTS).find(
    ([_, product]) => product.module_slug === moduleSlug
  );
  const product = productEntry ? productEntry[1] : null;
  const price = product ? product.price_cents / 100 : 0;

  const handlePurchase = async () => {
    if (!product) {
      toast.error('Product not found');
      return;
    }

    setLoading(true);
    try {
      // Use module slug as internal_reference - it should match fanbases_products table
      const result = await purchaseModule(moduleSlug);

      if (result.success) {
        toast.success(`${moduleName} unlocked!`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookCall = () => {
    // Open Calendly or booking link
    window.open('https://calendly.com/leveraged-creator', '_blank');
    onClose();
  };

  if (requiresCall) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Book a Call to Unlock</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              <strong>{moduleName}</strong> is only available to coaching clients.
              Book a strategy call to get access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-surface/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">
                This exclusive content includes advanced strategies and personalized
                coaching that's only available through our 1-on-1 program.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Maybe Later
            </Button>
            <Button onClick={handleBookCall} className="gap-2">
              <Calendar className="h-4 w-4" />
              Book a Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Unlock {moduleName}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get instant access to all lessons in this module.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{moduleName}</p>
              <p className="text-sm text-muted-foreground">One-time purchase</p>
            </div>
            <p className="text-2xl font-bold text-foreground">${price}</p>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Charged to your card on file
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Instant access after purchase
            </li>
          </ul>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Unlock for ${price}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
