import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CreditCard, Lock } from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialExpired?: boolean;
}

export function SubscribeModal({
  isOpen,
  onClose,
  trialExpired = false
}: SubscribeModalProps) {
  const handleSubscribe = () => {
    // Redirect to Fanbases checkout for subscription
    // TODO: Replace with actual Fanbases checkout URL
    window.open('https://fanbases.com/checkout/subscription', '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Lock className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-xl">
              {trialExpired ? "Trial Expired" : "Subscribe to Continue"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {trialExpired 
              ? "Your 7-day free trial has ended. Subscribe to keep using AI chat."
              : "Subscribe to access AI chat and all its powerful features."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">AI Chat Subscription</p>
              <p className="text-sm text-muted-foreground">Monthly billing</p>
            </div>
            <p className="text-2xl font-bold text-foreground">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Unlimited AI chat access
            </li>
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" />
              Ask AI about any lesson
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
              Cancel anytime
            </li>
          </ul>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button onClick={handleSubscribe} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscribe Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
