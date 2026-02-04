import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL - Production
const FANBASES_API_URL = "https://www.fanbasis.com/public-api";
//const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";

// Product mapping interface
interface FanbasesProduct {
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup" | "card_setup";
  internal_reference: string;
  price_cents: number | null;
}

// Look up product from fanbases_products table by internal_reference
// deno-lint-ignore no-explicit-any
async function lookupProductByInternalRef(supabase: any, internalReference: string): Promise<FanbasesProduct | null> {
  const { data, error } = await supabase
    .from("fanbases_products")
    .select("fanbases_product_id, product_type, internal_reference, price_cents")
    .eq("internal_reference", internalReference)
    .maybeSingle();

  if (error) {
    console.error("[Fanbases Charge] Error looking up product:", error);
    return null;
  }
  return data;
}

// Get tier and credits from internal_reference
function getSubscriptionDetails(internalReference: string): { tier: string; credits: number } {
  const tierMap: Record<string, { tier: string; credits: number }> = {
    tier1: { tier: "tier1", credits: 10000 },
    tier2: { tier: "tier2", credits: 40000 },
    starter: { tier: "tier1", credits: 10000 },
    pro: { tier: "tier2", credits: 40000 },
  };
  return tierMap[internalReference] || { tier: "tier1", credits: 10000 };
}

// Get credits from internal_reference for topups
function getTopupCredits(internalReference: string): number {
  const match = internalReference.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const FANBASES_API_KEY = Deno.env.get("FANBASES_API_KEY");
    if (!FANBASES_API_KEY) {
      console.error("FANBASES_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { internal_reference } = body;

    console.log(`[Fanbases Charge] Internal Ref: ${internal_reference}, User: ${user.id}`);

    // Look up product from fanbases_products table
    const product = await lookupProductByInternalRef(supabase, internal_reference);

    if (!product) {
      console.error(`[Fanbases Charge] Product not found: ${internal_reference}`);
      return new Response(JSON.stringify({ error: `Product not found: ${internal_reference}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Fanbases Charge] Found product: ${product.fanbases_product_id} (${product.product_type})`);

    // Get customer and payment method from local database
    const { data: customer, error: customerError } = await supabase
      .from("fanbases_customers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError && customerError.code !== "PGRST116") {
      console.error("Error fetching customer:", customerError);
      return new Response(JSON.stringify({ error: "Failed to fetch customer data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fanbasesCustomerId = customer?.fanbases_customer_id;
    let paymentMethodId = customer?.payment_method_id;

    // If no fanbases_customer_id, try to find by email in Fanbases API
    if (!fanbasesCustomerId) {
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).maybeSingle();
      const userEmail = userProfile?.email || user.email;

      if (userEmail) {
        console.log("[Fanbases Charge] No stored customer ID, looking up by email:", userEmail);

        try {
          let customersResponse = await fetch(`${FANBASES_API_URL}/customers?search=${encodeURIComponent(userEmail)}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": FANBASES_API_KEY,
            },
          });

          if (!customersResponse.ok || customersResponse.status === 400) {
            customersResponse = await fetch(`${FANBASES_API_URL}/customers?per_page=1000`, {
              method: "GET",
              headers: {
                Accept: "application/json",
                "x-api-key": FANBASES_API_KEY,
              },
            });
          }

          if (customersResponse.ok) {
            const customersData = await customersResponse.json();

            let customers: Array<{ id: string; email?: string }> = [];
            if (Array.isArray(customersData)) {
              customers = customersData;
            } else if (customersData.data?.customers) {
              customers = customersData.data.customers;
            } else if (customersData.customers) {
              customers = customersData.customers;
            } else if (customersData.data && Array.isArray(customersData.data)) {
              customers = customersData.data;
            }

            const matchedCustomer = customers.find((c) => c.email?.toLowerCase() === userEmail.toLowerCase());

            if (matchedCustomer) {
              fanbasesCustomerId = matchedCustomer.id;
              console.log(`[Fanbases Charge] Found customer by email: ${fanbasesCustomerId}`);

              // Update local database
              if (customer) {
                await supabase
                  .from("fanbases_customers")
                  .update({
                    fanbases_customer_id: fanbasesCustomerId,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", user.id);
              } else {
                await supabase.from("fanbases_customers").insert({
                  user_id: user.id,
                  fanbases_customer_id: fanbasesCustomerId,
                  email: userEmail,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            }
          }
        } catch (e) {
          console.error("[Fanbases Charge] Error looking up customer:", e);
        }
      }
    }

    if (!fanbasesCustomerId) {
      console.log("No Fanbases customer found for user:", user.id);
      return new Response(
        JSON.stringify({
          error: "No payment method on file. Please add a card first.",
          needs_payment_method: true,
          redirect_to_checkout: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch payment methods from Fanbases if not stored locally
    if (!paymentMethodId) {
      console.log("[Fanbases Charge] No stored payment method, fetching from Fanbases...");
      try {
        const pmResponse = await fetch(`${FANBASES_API_URL}/customers/${fanbasesCustomerId}/payment-methods`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-api-key": FANBASES_API_KEY,
          },
        });

        if (pmResponse.ok) {
          const pmData = await pmResponse.json();
          const paymentMethods = pmData.data?.payment_methods || [];

          if (paymentMethods.length > 0) {
            const defaultMethod =
              paymentMethods.find((pm: { is_default?: boolean }) => pm.is_default) || paymentMethods[0];
            paymentMethodId = defaultMethod.id;
            console.log("[Fanbases Charge] Found payment method:", paymentMethodId);

            await supabase
              .from("fanbases_customers")
              .update({
                payment_method_id: paymentMethodId,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);
          }
        }
      } catch (pmError) {
        console.error("[Fanbases Charge] Error fetching payment methods:", pmError);
      }
    }

    if (!paymentMethodId) {
      return new Response(
        JSON.stringify({
          error: "No payment method on file. Please add a card first.",
          needs_payment_method: true,
          redirect_to_checkout: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Charge using the Fanbases product ID
    console.log(
      `[Fanbases Charge] Charging customer ${fanbasesCustomerId} with product ${product.fanbases_product_id}`,
    );

    const chargePayload = {
      payment_method_id: paymentMethodId,
      product_id: product.fanbases_product_id,
      metadata: {
        user_id: user.id,
        product_type: product.product_type,
        internal_reference: product.internal_reference,
      },
    };
    console.log("[Fanbases Charge] Request payload:", JSON.stringify(chargePayload));

    const chargeResponse = await fetch(`${FANBASES_API_URL}/customers/${fanbasesCustomerId}/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": FANBASES_API_KEY,
      },
      body: JSON.stringify(chargePayload),
    });

    const responseText = await chargeResponse.text();
    console.log("[Fanbases Charge] Raw response:", responseText, "Status:", chargeResponse.status);

    let chargeData;
    try {
      chargeData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse charge response:", responseText);
      return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!chargeResponse.ok || chargeData.status === "error") {
      console.error("Charge failed:", chargeData);

      // If manual rebilling not allowed, indicate that checkout is needed
      if (chargeData.message?.includes("Manual rebilling is not allowed")) {
        return new Response(
          JSON.stringify({
            error: "One-click payment not available for your account",
            needs_checkout: true,
            redirect_to_checkout: true,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: chargeData.message || chargeData.error || "Payment failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chargeId = chargeData.data?.charge_id || chargeData.charge_id || chargeData.id;
    console.log(`[Fanbases Charge] Charge successful: ${chargeId}`);

    // Grant access based on product type
    if (product.product_type === "module") {
      const { data: existingPurchase } = await supabase
        .from("user_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.internal_reference)
        .maybeSingle();

      if (!existingPurchase) {
        await supabase.from("user_purchases").insert({
          user_id: user.id,
          product_id: product.internal_reference,
          product_type: "module",
          amount_cents: product.price_cents,
          charge_id: chargeId,
          status: "completed",
        });
      }
      console.log(`[Fanbases Charge] Module ${product.internal_reference} unlocked for user ${user.id}`);
    } else if (product.product_type === "subscription") {
      const subDetails = getSubscriptionDetails(product.internal_reference);
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      await supabase.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          tier: subDetails.tier,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: renewalDate.toISOString(),
          fanbases_subscription_id: chargeId,
        },
        { onConflict: "user_id" },
      );

      const { data: userProfile } = await supabase.from("users").select("credits").eq("id", user.id).maybeSingle();

      await supabase
        .from("users")
        .update({
          subscription_tier: subDetails.tier,
          credits: (userProfile?.credits || 0) + subDetails.credits,
        })
        .eq("id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: subDetails.credits,
        type: "subscription",
        payment_method: "fanbases",
        metadata: { tier: subDetails.tier, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] Subscription ${subDetails.tier} activated for user ${user.id}`);
    } else if (product.product_type === "topup") {
      const credits = getTopupCredits(product.internal_reference);

      const { data: userProfile } = await supabase.from("users").select("credits").eq("id", user.id).maybeSingle();

      await supabase
        .from("users")
        .update({ credits: (userProfile?.credits || 0) + credits })
        .eq("id", user.id);

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: credits,
        type: "topup",
        payment_method: "fanbases",
        metadata: { internal_reference: product.internal_reference, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] ${credits} credits added for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        charge_id: chargeId,
        product_type: product.product_type,
        message: "Payment successful",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Charge] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
