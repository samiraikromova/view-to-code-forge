import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function PaymentConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentIntent = searchParams.get("payment_intent");
      const redirectStatus = searchParams.get("redirect_status");
      const productType = searchParams.get("metadata[product_type]");
      const internalRef = searchParams.get("metadata[internal_reference]");

      if (!paymentIntent) {
        setStatus("error");
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fanbases-confirm-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            payment_intent: paymentIntent,
            redirect_status: redirectStatus,
            product_type: productType,
            internal_reference: internalRef,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus("success");
          setTimeout(() => {
            if (productType === "topup") {
              navigate("/settings?topup=success");
            } else if (productType === "subscription") {
              navigate("/settings?subscription=success");
            } else {
              navigate("/classroom");
            }
          }, 2000);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Payment confirmation error:", error);
        setStatus("error");
      }
    };

    confirmPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg">Processing your payment...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg">Payment successful! Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg">Payment confirmation failed.</p>
          </>
        )}
      </div>
    </div>
  );
}
