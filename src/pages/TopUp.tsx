import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Check, CreditCard, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const topUpOptions = [
  { credits: 1000, price: 10, perCredit: 0.01, popular: false },
  { credits: 2500, price: 25, perCredit: 0.01, popular: false },
  { credits: 5000, price: 50, perCredit: 0.01, popular: true },
  { credits: 10000, price: 100, perCredit: 0.01, popular: false },
];

export default function TopUp() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();
  const currentCredits = profile?.credits || 0;
  const [loading, setLoading] = useState<number | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Confirm payment after Fanbases redirect
  const confirmPayment = useCallback(async (params: URLSearchParams) => {
    const paymentIntent = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');
    const productType = params.get('metadata[product_type]') || params.get('product_type');
    const internalReference = params.get('metadata[internal_reference]') || params.get('internal_reference');
    const fanbasesProductId = params.get('metadata[fanbases_product_id]');
    
    // Also check for topup=success pattern
    const topupSuccess = params.get('topup');
    const credits = params.get('credits');
    
    console.log('[TopUp] Payment confirmation params:', {
      paymentIntent, redirectStatus, productType, internalReference, fanbasesProductId, topupSuccess, credits
    });

    if (!paymentIntent || redirectStatus !== 'succeeded') {
      console.log('[TopUp] No valid payment to confirm');
      return false;
    }

    setConfirmingPayment(true);
    try {
      // Determine product type and reference from URL
      let finalProductType = productType;
      let finalInternalRef = internalReference;
      
      if (topupSuccess === 'success' && credits) {
        finalProductType = 'topup';
        finalInternalRef = `${credits}_credits`;
      }

      const { data, error } = await supabase.functions.invoke('fanbases-confirm-payment', {
        body: {
          payment_intent: paymentIntent,
          redirect_status: redirectStatus,
          product_type: finalProductType,
          internal_reference: finalInternalRef,
          fanbases_product_id: fanbasesProductId,
        },
      });

      console.log('[TopUp] Confirm payment response:', data, error);

      if (error) {
        console.error('[TopUp] Error confirming payment:', error);
        toast.error('Failed to confirm payment. Please contact support.');
        return false;
      }

      if (data?.success) {
        if (data.already_processed) {
          toast.info('This payment was already processed');
        } else {
          toast.success(data.message || 'Credits added successfully!');
          // Refresh profile to get updated credits
          refreshProfile?.();
        }
        return true;
      } else {
        toast.error(data?.message || 'Payment confirmation failed');
        return false;
      }
    } catch (err) {
      console.error('[TopUp] Payment confirmation error:', err);
      toast.error('Failed to confirm payment');
      return false;
    } finally {
      setConfirmingPayment(false);
    }
  }, [refreshProfile]);

  // Handle return from Fanbases payment
  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');
    const topupSuccess = searchParams.get('topup');
    
    if (paymentIntent && redirectStatus === 'succeeded') {
      console.log('[TopUp] Detected successful payment redirect');
      confirmPayment(searchParams).then((confirmed) => {
        if (confirmed) {
          // Clear URL params after successful confirmation
          setSearchParams({});
        }
      });
    } else if (topupSuccess === 'cancelled') {
      setSearchParams({});
      toast.error('Top-up was cancelled');
    }
  }, [searchParams, setSearchParams, confirmPayment]);

  const handlePurchase = async (credits: number) => {
    setLoading(credits);
    try {
      // Map credits to internal_reference used in fanbases_products table
      const internalReference = `${credits}_credits`;
      
      // Use fanbases-checkout with existing product ID from fanbases_products
      const { data, error } = await supabase.functions.invoke('fanbases-checkout', {
        body: {
          action: 'create_checkout',
          internal_reference: internalReference,
          success_url: `${window.location.origin}/pricing/top-up?topup=success&credits=${credits}`,
          cancel_url: `${window.location.origin}/pricing/top-up?topup=cancelled`,
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
      console.error('Top-up error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Top Up Credits</h1>
            <p className="text-sm text-muted-foreground mt-1">Add more credits to your account</p>
          </div>
        </div>

        {/* Payment Confirmation Loading */}
        {confirmingPayment && (
          <Card className="mb-6 border-primary bg-primary/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <p className="text-foreground font-medium">Confirming your payment...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Balance */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold text-foreground">{currentCredits.toFixed(2)} credits</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Up Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {topUpOptions.map((option) => (
            <Card
              key={option.credits}
              className={`relative overflow-hidden transition-all hover:border-primary/50 ${
                option.popular ? "border-primary" : "border-border"
              }`}
            >
              {option.popular && (
                <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <CardTitle>{option.credits.toLocaleString()} Credits</CardTitle>
                </div>
                <CardDescription>
                  ${option.perCredit.toFixed(2)} per credit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold text-foreground">${option.price}</span>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent" />
                    Instant credit delivery
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent" />
                    No expiration
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent" />
                    Use across all tools
                  </li>
                </ul>
                <Button
                  className="w-full"
                  variant={option.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(option.credits)}
                  disabled={loading !== null || confirmingPayment}
                >
                  {loading === option.credits ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Redirecting...
                    </>
                  ) : (
                    'Purchase'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-surface/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Credits are added instantly after payment. Secure checkout powered by Fanbases.{" "}
              <Button variant="link" className="p-0 h-auto text-accent hover:text-accent-hover" onClick={() => navigate("/settings")}>
                Upgrade your plan
              </Button>{" "}
              for monthly credit allowances.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
