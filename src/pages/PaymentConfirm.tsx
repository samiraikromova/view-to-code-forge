import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle, Zap, Crown, BookOpen, CreditCard, ArrowRight, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PaymentDetails {
  product_type?: string;
  credits_added?: number;
  new_balance?: number;
  tier?: string;
  module_id?: string;
  module_name?: string;
  period_start?: string;
  period_end?: string;
  // Card setup fields
  card_brand?: string;
  card_last4?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  card_display?: string;
}

// Tier feature configurations
const TIER_FEATURES = {
  tier1: {
    name: "Starter",
    price: 29,
    credits: 10000,
    features: [
      "10,000 monthly credits",
      "AI Chat access",
      "Ask AI on lessons",
      "Priority support",
    ],
  },
  tier2: {
    name: "Pro", 
    price: 99,
    credits: 40000,
    features: [
      "40,000 monthly credits",
      "AI Chat access",
      "Ask AI on lessons",
      "Priority support",
      "Advanced AI models",
      "AI Hooks Generator access",
      "Image Ads Generator access",
    ],
  },
};

export default function PaymentConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [productType, setProductType] = useState<string | null>(null);

  const confirmPayment = useCallback(async () => {
    // Fanbases sends payment_id for card setup and payment_intent for other flows
    // Always check both formats
    const paymentIntent = searchParams.get("payment_intent") || searchParams.get("payment_id");
    // redirect_status may be missing - if user reached success URL, assume success
    const redirectStatus = searchParams.get("redirect_status") || "succeeded";
    
    // Extract metadata from URL (Fanbases uses metadata[key] format with brackets)
    // Support both bracket notation and direct params
    const urlProductType = searchParams.get("metadata[product_type]") || searchParams.get("product_type");
    const urlInternalReference = searchParams.get("metadata[internal_reference]") || searchParams.get("internal_reference");
    const urlFanbasesProductId = searchParams.get("metadata[fanbases_product_id]") || searchParams.get("fanbases_product_id");
    const urlUserId = searchParams.get("metadata[user_id]") || searchParams.get("user_id");
    const urlCheckoutSessionId = searchParams.get("checkout_session_id");
    
    console.log("[PaymentConfirm] URL params:", Object.fromEntries(searchParams.entries()));
    console.log("[PaymentConfirm] Extracted:", { paymentIntent, redirectStatus, urlProductType, urlInternalReference, urlUserId, urlFanbasesProductId, urlCheckoutSessionId });

    if (!paymentIntent) {
      setStatus("error");
      setMessage("Missing payment information (no payment_intent or payment_id)");
      return;
    }

    // If we have redirect_status and it's not succeeded, show error
    if (searchParams.has("redirect_status") && redirectStatus !== "succeeded") {
      setStatus("error");
      setMessage("Payment was not successful");
      return;
    }

    try {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Use URL user_id if available, otherwise use session
      let userId = urlUserId;
      if (!userId && sessionData.session?.user?.id) {
        userId = sessionData.session.user.id;
      }
      
      if (!userId) {
        console.error("[PaymentConfirm] No user ID available");
        setStatus("error");
        setMessage("Please log in to confirm your payment");
        return;
      }

      console.log("[PaymentConfirm] User ID:", userId);

      // If we have metadata from URL, use it directly
      let fetchedProductType = urlProductType;
      let internalReference = urlInternalReference;
      let checkoutSessionId: string | undefined = urlCheckoutSessionId || undefined;

      // If we don't have metadata from URL, look up from checkout_sessions table
      if (!fetchedProductType || !internalReference) {
        console.log("[PaymentConfirm] Looking up checkout session from database...");
        const { data: checkoutSession, error: lookupError } = await supabase
          .from("checkout_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lookupError) {
          console.error("[PaymentConfirm] Lookup error:", lookupError);
          setStatus("error");
          setMessage("Failed to find checkout session");
          return;
        }

        if (!checkoutSession) {
          console.error("[PaymentConfirm] No pending checkout session found");
          setStatus("error");
          setMessage("No pending checkout session found");
          return;
        }

        console.log("[PaymentConfirm] Found checkout session:", checkoutSession);
        fetchedProductType = checkoutSession.product_type;
        internalReference = checkoutSession.product_id;
        checkoutSessionId = checkoutSession.checkout_session_id;
      }

      setProductType(fetchedProductType || null);

      console.log("[PaymentConfirm] Calling fanbases-confirm-payment with:", {
        payment_intent: paymentIntent,
        redirect_status: redirectStatus,
        product_type: fetchedProductType,
        internal_reference: internalReference,
        fanbases_product_id: urlFanbasesProductId,
        checkout_session_id: checkoutSessionId,
        user_id: userId,
      });

      const { data, error } = await supabase.functions.invoke("fanbases-confirm-payment", {
        body: {
          payment_intent: paymentIntent,
          redirect_status: redirectStatus,
          product_type: fetchedProductType,
          internal_reference: internalReference,
          fanbases_product_id: urlFanbasesProductId,
          checkout_session_id: checkoutSessionId,
          user_id: userId,
        },
      });

      console.log("[PaymentConfirm] Response:", data, error);

      if (error) {
        console.error("[PaymentConfirm] Error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to confirm payment");
        return;
      }

      if (data?.success) {
        setStatus("success");
        setMessage(data.message || "Payment confirmed!");
        setDetails(data.details || null);
        
        // Removed auto-redirect - user must click buttons to navigate
      } else {
        setStatus("error");
        setMessage(data?.message || data?.error || "Payment confirmation failed");
      }
    } catch (err) {
      console.error("[PaymentConfirm] Exception:", err);
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    confirmPayment();
  }, [confirmPayment]);

  const handleClose = () => {
    window.close();
  };

  const handleGoToApp = () => {
    navigate("/chat");
  };

  // Render success content based on product type
  const renderSuccessContent = () => {
    if (!details) {
      return (
        <p className="text-muted-foreground">Your payment has been processed successfully.</p>
      );
    }

    const currentProductType = productType || details.product_type;

    switch (currentProductType) {
      case "topup":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-accent" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Credits Added!</h2>
              <p className="text-muted-foreground">Your account has been topped up successfully</p>
            </div>

            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Credits Purchased</span>
                  <Badge className="bg-accent/20 text-accent border-accent/30 text-lg px-3 py-1">
                    +{details.credits_added?.toLocaleString()}
                  </Badge>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-foreground">New Balance</span>
                  <span className="text-2xl font-bold text-accent">
                    {details.new_balance?.toLocaleString()} credits
                  </span>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
              📧 A confirmation email with your payment details has been sent to your inbox.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full gap-2 bg-accent hover:bg-accent-hover text-accent-foreground"
                onClick={() => navigate("/chat")}
              >
                <MessageSquare className="h-5 w-5" />
                Start Using Credits
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "subscription":
        const tierKey = (details.tier || "tier1") as keyof typeof TIER_FEATURES;
        const tierInfo = TIER_FEATURES[tierKey] || TIER_FEATURES.tier1;
        
        // Format subscription dates
        const formatDate = (dateStr?: string) => {
          if (!dateStr) return null;
          return new Date(dateStr).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        };
        const startDate = formatDate(details.period_start);
        const endDate = formatDate(details.period_end);
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Welcome to {tierInfo.name}!</h2>
              <p className="text-muted-foreground">Your subscription is now active</p>
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{tierInfo.name} Plan</p>
                    <p className="text-muted-foreground">${tierInfo.price}/month</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    Active
                  </Badge>
                </div>
                
                {(startDate || endDate) && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {startDate && (
                        <div>
                          <p className="text-muted-foreground">Started</p>
                          <p className="font-medium text-foreground">{startDate}</p>
                        </div>
                      )}
                      {endDate && (
                        <div>
                          <p className="text-muted-foreground">Renews</p>
                          <p className="font-medium text-foreground">{endDate}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Credits Added</p>
                  <p className="text-2xl font-bold text-accent">
                    +{tierInfo.credits.toLocaleString()} credits
                  </p>
                  {details.new_balance && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Total balance: {details.new_balance.toLocaleString()} credits
                    </p>
                  )}
                </div>

                <Separator className="my-4" />
                
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Your Features:</p>
                  <ul className="space-y-2">
                    {tierInfo.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
              📧 A confirmation email with your subscription details has been sent to your inbox.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full gap-2 bg-accent hover:bg-accent-hover text-accent-foreground"
                onClick={() => navigate("/chat")}
              >
                <MessageSquare className="h-5 w-5" />
                Start Chatting
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "module":
        const moduleName = details.module_name || details.module_id || "your module";
        const moduleId = details.module_id;
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-accent" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Module Unlocked!</h2>
              <p className="text-muted-foreground">You now have full access to this content</p>
            </div>

            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
              <CardContent className="p-6 text-center">
                <p className="text-lg font-semibold text-foreground mb-2">{moduleName}</p>
                <p className="text-muted-foreground text-sm">
                  Access all lessons, videos, and downloadable files
                </p>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
              📧 A confirmation email with your purchase details has been sent to your inbox.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full gap-2 bg-accent hover:bg-accent-hover text-accent-foreground"
                onClick={() => navigate(moduleId ? `/chat?module=${moduleId}` : "/chat")}
              >
                <BookOpen className="h-5 w-5" />
                Go to Module
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "card_setup":
        const cardDisplay = details.card_display || "Your card";
        const cardBrand = details.card_brand ? 
          details.card_brand.charAt(0).toUpperCase() + details.card_brand.slice(1) : null;
        const cardLast4 = details.card_last4;
        const cardExpiry = details.card_exp_month && details.card_exp_year ? 
          `${String(details.card_exp_month).padStart(2, '0')}/${String(details.card_exp_year).slice(-2)}` : null;
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Card Saved!</h2>
              <p className="text-muted-foreground">Your payment method has been added successfully</p>
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-background/50 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {cardBrand && cardLast4 ? `${cardBrand} •••• ${cardLast4}` : cardDisplay}
                      </p>
                      {cardExpiry && (
                        <p className="text-sm text-muted-foreground">Expires {cardExpiry}</p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-accent/20 text-accent border-accent/30">Saved</Badge>
                </div>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground text-center">
                  This card is now saved for future purchases. You can manage your payment methods anytime in Settings.
                </p>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
              📧 A confirmation email has been sent to your inbox with your card details.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full gap-2 bg-accent hover:bg-accent-hover text-accent-foreground"
                onClick={() => navigate("/chat")}
              >
                <MessageSquare className="h-5 w-5" />
                Start Chatting
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="w-full gap-2"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-5 w-5" />
                Manage Payment Methods
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Your payment has been processed successfully.</p>
            <Button onClick={handleGoToApp}>Go to App</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {status === "processing" && (
          <div className="text-center p-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-foreground">Processing your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your purchase</p>
          </div>
        )}
        
        {status === "success" && (
          <div className="p-6">
            {renderSuccessContent()}
            <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
              <button 
                onClick={handleClose}
                className="hover:text-foreground transition-colors"
              >
                Close Tab
              </button>
            </div>
          </div>
        )}
        
        {status === "error" && (
          <div className="text-center p-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Payment Confirmation Failed</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <div className="flex gap-2 justify-center mt-6">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close Tab
              </Button>
              <Button size="sm" onClick={handleGoToApp}>
                Go to App
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}