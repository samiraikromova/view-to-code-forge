import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentConfirm() {
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentIntent = searchParams.get("payment_intent");
      const redirectStatus = searchParams.get("redirect_status");
      const productType = searchParams.get("metadata[product_type]");
      const internalRef = searchParams.get("metadata[internal_reference]");
      const fanbasesProductId = searchParams.get("metadata[fanbases_product_id]");

      console.log("[PaymentConfirm] Params:", {
        paymentIntent,
        redirectStatus,
        productType,
        internalRef,
        fanbasesProductId,
      });

      if (!paymentIntent) {
        setStatus("error");
        setMessage("No payment information found.");
        return;
      }

      if (redirectStatus !== "succeeded") {
        setStatus("error");
        setMessage("Payment was not successful.");
        return;
      }

      if (!user) {
        // Wait for auth to load
        setTimeout(() => {
          if (!user) {
            setStatus("error");
            setMessage("Please log in to complete payment confirmation.");
          }
        }, 2000);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("fanbases-confirm-payment", {
          body: {
            payment_intent: paymentIntent,
            redirect_status: redirectStatus,
            product_type: productType,
            internal_reference: internalRef,
            fanbases_product_id: fanbasesProductId,
          },
        });

        console.log("[PaymentConfirm] Response:", data, error);

        if (error) {
          console.error("[PaymentConfirm] Error:", error);
          setStatus("error");
          setMessage("Failed to confirm payment. Please contact support.");
          return;
        }

        if (data?.success) {
          setStatus("success");
          setMessage(data.message || "Payment confirmed successfully!");

          // Refresh profile to get updated credits/subscription
          refreshProfile?.();

          // Redirect after showing success
          setTimeout(() => {
            if (productType === "topup") {
              navigate("/settings?topup=success");
            } else if (productType === "subscription") {
              navigate("/settings?subscription=success");
            } else if (productType === "module") {
              navigate("/classroom?unlock=success");
            } else {
              navigate("/settings");
            }
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data?.message || "Payment confirmation failed.");
        }
      } catch (err) {
        console.error("[PaymentConfirm] Error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    confirmPayment();
  }, [searchParams, user, navigate, refreshProfile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === "processing" && (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h2 className="text-xl font-semibold text-foreground">Processing Payment</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h2 className="text-xl font-semibold text-foreground">Payment Successful!</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold text-foreground">Payment Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <Button onClick={() => navigate("/settings")} className="mt-4">
                  Go to Settings
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
