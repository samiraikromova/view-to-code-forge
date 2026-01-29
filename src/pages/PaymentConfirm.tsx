import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);

  const confirmPayment = useCallback(async () => {
    // Fanbases appends these params after successful payment
    const paymentIntent = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");
    
    console.log("[PaymentConfirm] URL params:", Object.fromEntries(searchParams.entries()));

    if (!paymentIntent) {
      setStatus("error");
      setMessage("Missing payment information");
      return;
    }

    if (redirectStatus !== "succeeded") {
      setStatus("error");
      setMessage("Payment was not successful");
      return;
    }

    try {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session?.user?.id) {
        console.error("[PaymentConfirm] No active session");
        setStatus("error");
        setMessage("Please log in to confirm your payment");
        return;
      }

      const userId = sessionData.session.user.id;
      console.log("[PaymentConfirm] User ID:", userId);

      // Look up the most recent pending checkout session for this user
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

      const productType = checkoutSession.product_type;
      const internalReference = checkoutSession.product_id;

      console.log("[PaymentConfirm] Calling fanbases-confirm-payment...");

      const { data, error } = await supabase.functions.invoke("fanbases-confirm-payment", {
        body: {
          payment_intent: paymentIntent,
          redirect_status: redirectStatus,
          product_type: productType,
          internal_reference: internalReference,
          checkout_session_id: checkoutSession.id,
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
        
        // Auto redirect after 3 seconds
        setTimeout(() => {
          if (productType === "topup") {
            navigate("/settings?topup=success");
          } else if (productType === "subscription") {
            navigate("/settings?subscription=success");
          } else if (productType === "module") {
            navigate("/chat?module=purchased");
          } else {
            navigate("/chat");
          }
        }, 3000);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-foreground">Processing your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your purchase</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">{message}</p>
            {details && (
              <div className="mt-2 text-sm text-muted-foreground">
                {details.credits_added && <p>Added {String(details.credits_added)} credits</p>}
                {details.new_balance && <p>New balance: {String(details.new_balance)} credits</p>}
                {details.tier && <p>Subscription: {String(details.tier)}</p>}
                {details.module && <p>Module unlocked: {String(details.module)}</p>}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">Redirecting you shortly...</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close Tab
              </Button>
              <Button size="sm" onClick={handleGoToApp}>
                Go to App
              </Button>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Payment Confirmation Failed</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close Tab
              </Button>
              <Button size="sm" onClick={handleGoToApp}>
                Go to App
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
