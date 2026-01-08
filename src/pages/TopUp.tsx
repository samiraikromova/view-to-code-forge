import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Check, CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { purchaseCredits, getOrCreateCustomer, setupPaymentMethod } from "@/api/fanbases/fanbasesApi";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const topUpOptions = [
  { credits: 1000, price: 10, perCredit: 0.01, popular: false },
  { credits: 2500, price: 25, perCredit: 0.01, popular: false },
  { credits: 5000, price: 50, perCredit: 0.01, popular: true },
  { credits: 10000, price: 100, perCredit: 0.01, popular: false },
];

export default function TopUp() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const currentCredits = profile?.credits || 0;
  const [loading, setLoading] = useState<number | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const [settingUpCard, setSettingUpCard] = useState(false);

  useEffect(() => {
    const checkPaymentMethod = async () => {
      const result = await getOrCreateCustomer();
      setHasPaymentMethod(result.has_payment_method);
    };
    checkPaymentMethod();
  }, []);

  const handleAddCard = async () => {
    setSettingUpCard(true);
    try {
      const result = await setupPaymentMethod();
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        toast.error(result.error || 'Failed to set up payment method');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSettingUpCard(false);
    }
  };

  const handlePurchase = async (credits: number, priceCents: number) => {
    if (!hasPaymentMethod) {
      toast.error('Please add a payment method first');
      return;
    }
    setLoading(credits);
    try {
      const result = await purchaseCredits(credits, priceCents);
      if (result.success) {
        toast.success(`${credits.toLocaleString()} credits added!`);
        refreshProfile?.();
      } else {
        toast.error(result.error || 'Purchase failed');
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

        {/* Payment Method Status */}
        {hasPaymentMethod === false && (
          <Card className="mb-6 border-warning bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-foreground">No payment method on file</p>
                    <p className="text-sm text-muted-foreground">Add a card to purchase credits</p>
                  </div>
                </div>
                <Button onClick={handleAddCard} disabled={settingUpCard} className="bg-accent hover:bg-accent-hover text-accent-foreground">
                  {settingUpCard ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Setting up...
                    </>
                  ) : (
                    'Add Card'
                  )}
                </Button>
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
                  onClick={() => handlePurchase(option.credits, option.price * 100)}
                  disabled={loading !== null}
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <Card className="bg-surface/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
            Credits are added instantly after purchase. All purchases are charged to your card on file.{" "}
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
