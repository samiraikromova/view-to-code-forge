import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Check, Zap, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PLANS, SubscriptionTier } from "@/types/subscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { SubscriptionModal, TopUpModal, CardSetupFeeModal } from "@/components/payments";
import { setupPaymentMethod, fetchPaymentMethods } from "@/api/fanbases/fanbasesApi";
import { toast } from "sonner";
import { TransactionHistory } from "@/components/settings/TransactionHistory";

interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default?: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCardSetupModal, setShowCardSetupModal] = useState(false);
  const [settingUpCard, setSettingUpCard] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const handleAddCardClick = () => {
    setShowCardSetupModal(true);
  };

  const handleConfirmCardSetup = async () => {
    setSettingUpCard(true);
    try {
      const result = await setupPaymentMethod();
      if (result.success && result.checkout_url) {
        // Store session ID for later sync
        if (result.checkout_session_id) {
          localStorage.setItem('fanbases_checkout_session', result.checkout_session_id);
        }
        setShowCardSetupModal(false);
        // Redirect in same window so confirmation runs when returning
        window.location.href = result.checkout_url;
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

  const loadPaymentMethods = async (paymentId?: string, email?: string, showToast = false) => {
    setLoadingPaymentMethods(true);
    try {
      const result = await fetchPaymentMethods(paymentId, email);
      console.log('[Settings] fetchPaymentMethods result:', result);
      if (result.success && result.payment_methods) {
        setPaymentMethods(result.payment_methods);
        if (showToast && result.payment_methods.length > 0) {
          toast.success('Payment method loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Confirm payment after Fanbases redirect
  const confirmPayment = useCallback(async (params: URLSearchParams) => {
    const paymentIntent = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');
    const productType = params.get('metadata[product_type]') || params.get('product_type');
    const internalReference = params.get('metadata[internal_reference]') || params.get('internal_reference') || params.get('credits');
    const fanbasesProductId = params.get('metadata[fanbases_product_id]');
    
    // Also check for topup=success pattern
    const topupSuccess = params.get('topup');
    const credits = params.get('credits');
    
    console.log('[Settings] Payment confirmation params:', {
      paymentIntent, redirectStatus, productType, internalReference, fanbasesProductId, topupSuccess, credits
    });

    if (!paymentIntent || redirectStatus !== 'succeeded') {
      console.log('[Settings] No valid payment to confirm');
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

      console.log('[Settings] Confirm payment response:', data, error);

      if (error) {
        console.error('[Settings] Error confirming payment:', error);
        toast.error('Failed to confirm payment. Please contact support.');
        return false;
      }

      if (data?.success) {
        if (data.already_processed) {
          toast.info('This payment was already processed');
        } else {
          toast.success(data.message || 'Payment confirmed successfully!');
          // Refresh profile to get updated credits/subscription
          refreshProfile?.();
        }
        return true;
      } else {
        toast.error(data?.message || 'Payment confirmation failed');
        return false;
      }
    } catch (err) {
      console.error('[Settings] Payment confirmation error:', err);
      toast.error('Failed to confirm payment');
      return false;
    } finally {
      setConfirmingPayment(false);
    }
  }, [refreshProfile]);

  // Handle return from Fanbases checkout - card setup
  // Fanbases ignores success_url and redirects back to /settings with setup=complete
  // We need to manually redirect to /payment-confirm with all the params
  useEffect(() => {
    const setup = searchParams.get('setup');
    const paymentId = searchParams.get('payment_id');
    
    if (setup === 'complete' && paymentId) {
      console.log('[Settings] Card setup complete, redirecting to payment-confirm');
      console.log('[Settings] All params:', Object.fromEntries(searchParams.entries()));
      
      // Forward all params to payment-confirm page (same as Fanbases would do for other payment types)
      // Include metadata with bracket notation (same format as Fanbases uses)
      const confirmUrl = new URL('/payment-confirm', window.location.origin);
      
      // Copy ALL params from the current URL
      searchParams.forEach((value, key) => {
        // Skip setup param itself and success/cancel URLs
        if (key !== 'setup' && !key.includes('success_url') && !key.includes('cancel_url')) {
          confirmUrl.searchParams.set(key, value);
        }
      });
      
      // Ensure we have the required params for the confirmation flow
      confirmUrl.searchParams.set('redirect_status', 'succeeded');
      
      // Add checkout_session_id from localStorage if available (stored before redirect)
      const storedSessionId = localStorage.getItem('fanbases_checkout_session');
      if (storedSessionId) {
        confirmUrl.searchParams.set('checkout_session_id', storedSessionId);
        localStorage.removeItem('fanbases_checkout_session'); // Clean up
      }
      
      console.log('[Settings] Redirecting to:', confirmUrl.toString());
      window.location.href = confirmUrl.toString();
      return;
    } else if (setup === 'cancelled') {
      setSearchParams({});
      toast.error('Card setup was cancelled');
    }
  }, [searchParams, setSearchParams]);

  // Handle return from Fanbases payment - confirm and grant access
  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');
    const topupSuccess = searchParams.get('topup');
    
    if (paymentIntent && redirectStatus === 'succeeded') {
      console.log('[Settings] Detected successful payment redirect');
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

  // Load payment methods on mount - always fetch to check Fanbases API
  useEffect(() => {
    if (user) {
      loadPaymentMethods();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      const tierMap: Record<string, SubscriptionTier> = {
        free: "free",
        tier1: "starter",
        starter: "starter",
        tier2: "pro",
        pro: "pro",
      };
      setCurrentTier(tierMap[profile.subscription_tier] || "free");
      setLoading(false);
    }
  }, [profile, user]);

  const formatCardBrand = (brand?: string) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={() => refreshProfile?.()}
        currentTier={currentTier}
      />
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={() => refreshProfile?.()}
        currentCredits={profile?.credits || 0}
      />
      <CardSetupFeeModal
        isOpen={showCardSetupModal}
        onClose={() => setShowCardSetupModal(false)}
        onConfirm={handleConfirmCardSetup}
        isLoading={settingUpCard}
      />

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-foreground">{(profile?.credits || 0).toFixed(2)} credits</p>
                </div>
                <Button onClick={() => setShowTopUpModal(true)} className="gap-2 bg-accent hover:bg-accent-hover text-accent-foreground">
                  <Zap className="h-4 w-4" />
                  Top Up
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-3xl font-bold text-foreground">{PLANS[currentTier].name}</p>
                </div>
                {currentTier !== "pro" && (
                  <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10" onClick={() => setShowSubscriptionModal(true)}>
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plan Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Manage your current plan and billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface/50">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{PLANS[currentTier].name} Plan</h3>
                    <Badge variant="outline" className="bg-[#8e4b9b]/20 text-[#8e4b9b] border-[#8e4b9b]/30">
                      Current Plan
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">${PLANS[currentTier].price}/month</p>
                  <ul className="mt-3 space-y-2">
                    {PLANS[currentTier].features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                {currentTier !== "pro" && (
                    <Button onClick={() => setShowSubscriptionModal(true)} className="bg-accent hover:bg-accent-hover text-accent-foreground">
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Available Plans</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(PLANS) as SubscriptionTier[]).map((tier) => {
                    const plan = PLANS[tier];
                    const isCurrent = tier === currentTier;
                    return (
                      <div
                        key={tier}
                        className={`p-4 border rounded-lg ${
                          isCurrent ? "border-primary bg-primary/5" : "border-border bg-surface/30"
                        }`}
                      >
                        <h5 className="font-semibold text-foreground">{plan.name}</h5>
                        <p className="text-2xl font-bold text-foreground mt-2">${plan.price}</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && tier !== "free" && (
                          <Button
                            variant={tier === "pro" ? "default" : "outline"}
                            className={`w-full mt-4 ${tier === "pro" ? "bg-accent hover:bg-accent-hover text-accent-foreground" : "border-accent text-accent hover:bg-accent/10"}`}
                            size="sm"
                            onClick={() => setShowSubscriptionModal(true)}
                          >
                            {tier === "pro" ? "Upgrade" : "Switch"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <TransactionHistory />

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Your card on file for one-click purchases</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => loadPaymentMethods()}
                disabled={loadingPaymentMethods}
              >
                <RefreshCw className={`h-4 w-4 ${loadingPaymentMethods ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Filter out "link" type payment methods (only show cards), then deduplicate by last4 + brand
              const cardMethods = paymentMethods.filter(pm => pm.type === 'card' && pm.last4);
              const uniquePaymentMethods = cardMethods.reduce((acc, pm) => {
                const key = `${pm.brand || ''}-${pm.last4 || ''}`;
                if (!acc.has(key)) {
                  acc.set(key, pm);
                }
                return acc;
              }, new Map<string, PaymentMethod>());
              const deduplicatedMethods = Array.from(uniquePaymentMethods.values());

              // Customer portal URL - for production use: https://fanbasis.com/portal/customer/settings?token=...
              const customerPortalUrl = "https://qa.dev-fan-basis.com/portal/customer/settings?token=cc8a871002290d3cc4e93bdafe136d0fb6a807eb8b5a41b6c11a51d4fa3a4826";

              return loadingPaymentMethods ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
                </div>
              ) : deduplicatedMethods.length > 0 ? (
                <div className="space-y-3">
                  {deduplicatedMethods.map((pm) => (
                    <div 
                      key={pm.id} 
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-[#8e4b9b]/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-[#8e4b9b]" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {formatCardBrand(pm.brand)} •••• {pm.last4 || '****'}
                          </p>
                          {pm.exp_month && pm.exp_year && (
                            <p className="text-sm text-muted-foreground">
                              Expires {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year.toString().slice(-2)}
                            </p>
                          )}
                        </div>
                      </div>
                      {pm.is_default && (
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                          Default
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline"
                    className="w-full mt-4 gap-2" 
                    onClick={handleAddCardClick}
                    disabled={settingUpCard}
                  >
                    {settingUpCard ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Add Another Card
                  </Button>
                  
                  <Separator className="my-4" />
                  
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-primary/30 hover:bg-primary/10"
                    asChild
                  >
                    <a 
                      href={customerPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Manage Cards (Set Default, Remove)
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 text-accent mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No payment method on file. Add a card to enable one-click purchases.
                  </p>
                  <Button 
                    className="bg-accent hover:bg-accent-hover text-accent-foreground gap-2" 
                    onClick={handleAddCardClick}
                    disabled={settingUpCard}
                  >
                    {settingUpCard ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Add Card
                  </Button>
                  
                  <Separator className="my-4" />
                  
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-primary/30 hover:bg-primary/10"
                    asChild
                  >
                    <a 
                      href={customerPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Manage Cards (Set Default, Remove)
                    </a>
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
