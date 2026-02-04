import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
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
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);

  // Check if user has already used their trial
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!userId || !isOpen) return;
      
      setCheckingTrial(true);
      try {
        const { data } = await supabase
          .from('users')
          .select('trial_started_at')
          .eq('id', userId)
          .single();
        
        // If trial_started_at exists, user has already used their trial
        setHasUsedTrial(!!data?.trial_started_at);
      } catch (error) {
        console.error('Error checking trial status:', error);
      } finally {
        setCheckingTrial(false);
      }
    };

    checkTrialStatus();
  }, [userId, isOpen]);

  const handleStartTrial = async () => {
    if (hasUsedTrial) {
      toast.error('You have already used your free trial.');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Double-check that user hasn't started trial (race condition prevention)
      const { data: currentUser } = await supabase
        .from('users')
        .select('credits, trial_started_at')
        .eq('id', userId)
        .single();

      if (currentUser?.trial_started_at) {
        toast.error('You have already used your free trial.');
        setHasUsedTrial(true);
        setLoading(false);
        return;
      }

      const currentCredits = Number(currentUser?.credits) || 0;

      const { error } = await supabase
        .from('users')
        .update({
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndDate.toISOString(),
          subscription_tier: 'trial',
          credits: currentCredits + 1000
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Your 7-day free trial has started with 1,000 credits!');
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
          {hasUsedTrial ? (
            <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Trial Already Used</p>
                  <p className="text-sm text-muted-foreground">
                    You have already used your free trial. Please subscribe to continue using AI features.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface/50 rounded-lg p-4 border border-border space-y-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">1,000 Free Credits</p>
                  <p className="text-sm text-muted-foreground">
                    Get 1,000 credits to use with AI chat, image generation, and more.
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
          )}

          {!hasUsedTrial && (
            <p className="text-xs text-muted-foreground text-center">
              Credits are consumed as you use AI features. After your trial ends, subscribe at $29/month to continue.
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {hasUsedTrial ? 'Close' : 'Maybe Later'}
          </Button>
          {!hasUsedTrial && (
            <Button onClick={handleStartTrial} disabled={loading || checkingTrial} className="gap-2">
              {loading || checkingTrial ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkingTrial ? 'Checking...' : 'Starting...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Start 7-Day Trial
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
