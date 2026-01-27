import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, Download, Check, Zap, Loader2, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PLANS, SubscriptionTier } from "@/types/subscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { SubscriptionModal, TopUpModal } from "@/components/payments";
import { setupPaymentMethod, fetchPaymentMethods } from "@/api/fanbases/fanbasesApi";
import { toast } from "sonner";

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  type: string;
}

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
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [settingUpCard, setSettingUpCard] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const handleAddCard = async () => {
    setSettingUpCard(true);
    try {
      const result = await setupPaymentMethod();
      if (result.success && result.checkout_url) {
        // Store session ID for later sync
        if (result.checkout_session_id) {
          localStorage.setItem('fanbases_checkout_session', result.checkout_session_id);
        }
        window.open(result.checkout_url, '_blank');
        toast.info('Complete the payment in the new tab, then return here and click "Refresh" to see your card');
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

  const loadPaymentMethods = async (paymentId?: string, email?: string) => {
    setLoadingPaymentMethods(true);
    try {
      const result = await fetchPaymentMethods(paymentId, email);
      console.log('[Settings] fetchPaymentMethods result:', result);
      if (result.success && result.payment_methods) {
        setPaymentMethods(result.payment_methods);
        if (result.payment_methods.length > 0) {
          toast.success('Payment method loaded successfully');
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Handle return from Fanbases checkout
  useEffect(() => {
    const setup = searchParams.get('setup');
    const paymentId = searchParams.get('payment_id');
    const email = searchParams.get('email');
    
    if (setup === 'complete') {
      console.log('[Settings] Returned from checkout with payment_id:', paymentId, 'email:', email);
      // Clear URL params
      setSearchParams({});
      
      // Fetch payment methods with the payment ID and email from redirect
      loadPaymentMethods(paymentId || undefined, email || undefined);
      toast.success('Card setup complete! Loading your payment method...');
    } else if (setup === 'cancelled') {
      setSearchParams({});
      toast.error('Card setup was cancelled');
    }
  }, [searchParams, setSearchParams]);

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
    }
    if (user) {
      fetchBillingHistory();
    }
  }, [profile, user]);

  async function fetchBillingHistory() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setBillingHistory(
          data.map((tx) => ({
            id: tx.id,
            date: new Date(tx.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            amount: Math.abs(tx.amount || 0),
            status: "Completed",
            type: tx.type || "Credit",
          })),
        );
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatCardBrand = (brand?: string) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  if (loading && billingHistory.length === 0) {
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
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View your recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium font-mono text-xs">{record.id.slice(0, 8)}...</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell className="capitalize">{record.type}</TableCell>
                      <TableCell>{record.amount.toFixed(2)} credits</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? "Loading..." : "No transactions yet"}
              </div>
            )}
          </CardContent>
        </Card>

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
            {loadingPaymentMethods ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
              </div>
            ) : paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
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
                  onClick={handleAddCard}
                  disabled={settingUpCard}
                >
                  {settingUpCard ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Add Another Card
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
                  onClick={handleAddCard}
                  disabled={settingUpCard}
                >
                  {settingUpCard ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Add Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
