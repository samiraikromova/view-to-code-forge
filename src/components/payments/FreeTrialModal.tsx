import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FreeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

export function FreeTrialModal({
  isOpen,
  onClose,
  onSuccess,
  userId
}: FreeTrialModalProps) {
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const { error } = await supabase
        .from('users')
        .update({
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndDate.toISOString(),
          subscription_tier: 'trial'
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Your 7-day free trial has started!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-xl">Start Your Free Trial</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Get 7 days of full access to AI chat and all its features.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-surface/50 rounded-lg p-4 border border-border space-y-3">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Unlimited AI Chat</p>
                <p className="text-sm text-muted-foreground">
                  Ask questions about any lesson, get personalized advice, and more.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">7 Days Free</p>
                <p className="text-sm text-muted-foreground">
                  No credit card required. After the trial, subscribe to continue.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            After your trial ends, you'll need to subscribe at $29/month to continue using AI features.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Maybe Later
          </Button>
          <Button onClick={handleStartTrial} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Start 7-Day Trial
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
