import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL
// SANDBOX (for testing):
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";
// PRODUCTION (for live):
// const FANBASES_API_URL = 'https://www.fanbasis.com/public-api';

// Product mapping interface
interface FanbasesProduct {
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup";
  internal_reference: string;
}

// Look up product from fanbases_products table by internal_reference
// The frontend sends internal references (e.g., 'steal-my-script', 'tier1', '1000_credits')
// and we need to find the actual Fanbases product ID
// deno-lint-ignore no-explicit-any
async function lookupProductByInternalRef(supabase: any, internalReference: string): Promise<FanbasesProduct | null> {
  const { data, error } = await supabase
    .from("fanbases_products")
    .select("fanbases_product_id, product_type, internal_reference")
    .eq("internal_reference", internalReference)
    .maybeSingle();

  if (error) {
    console.error("[Fanbases Charge] Error looking up product by internal_reference:", error);
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
    const { product_type, product_id, amount_cents, description } = body;

    console.log(
      `[Fanbases Charge] Type: ${product_type}, Product: ${product_id}, Amount: ${amount_cents} cents, User: ${user.id}`,
    );

    // Get user email for lookups
    const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();
    const userEmail = userProfile?.email || user.email;

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
    if (!fanbasesCustomerId && userEmail) {
      console.log("[Fanbases Charge] No stored customer ID, looking up by email:", userEmail);
      
      try {
        const customersResponse = await fetch(`${FANBASES_API_URL}/customers?per_page=200`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-api-key": FANBASES_API_KEY,
          },
        });

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
          
          console.log(`[Fanbases Charge] Found ${customers.length} total customers`);
          const matchedCustomer = customers.find((c) => c.email?.toLowerCase() === userEmail.toLowerCase());
          
          if (matchedCustomer) {
            fanbasesCustomerId = matchedCustomer.id;
            console.log(`[Fanbases Charge] Found customer by email: ${fanbasesCustomerId}`);
            
            // Insert or update our local database record
            if (customer) {
              await supabase
                .from("fanbases_customers")
                .update({
                  fanbases_customer_id: fanbasesCustomerId,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
            } else {
              // No local record exists - create one
              await supabase.from("fanbases_customers").insert({
                user_id: user.id,
                fanbases_customer_id: fanbasesCustomerId,
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

    if (!fanbasesCustomerId) {
      console.log("No Fanbases customer found for user:", user.id);
      return new Response(
        JSON.stringify({ error: "No payment method on file. Please add a card first.", needs_payment_method: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try to fetch payment methods from Fanbases if we don't have one stored
    if (!paymentMethodId) {
      console.log("[Fanbases Charge] No stored payment method, fetching from Fanbases...");
      try {
        const pmResponse = await fetch(
          `${FANBASES_API_URL}/customers/${fanbasesCustomerId}/payment-methods`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": FANBASES_API_KEY,
            },
          },
        );

        if (pmResponse.ok) {
          const pmData = await pmResponse.json();
          const paymentMethods = pmData.data?.payment_methods || [];

          if (paymentMethods.length > 0) {
            paymentMethodId = paymentMethods[0].id;
            console.log("[Fanbases Charge] Found payment method:", paymentMethodId);

            // Update our database
            await supabase
              .from("fanbases_customers")
              .update({ payment_method_id: paymentMethodId, updated_at: new Date().toISOString() })
              .eq("user_id", user.id);
          }
        }
      } catch (pmError) {
        console.error("[Fanbases Charge] Error fetching payment methods:", pmError);
      }
    }

    if (!paymentMethodId) {
      return new Response(
        JSON.stringify({ error: "No payment method on file. Please add a card first.", needs_payment_method: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Charge customer via Fanbases API
    console.log(
      `[Fanbases Charge] Charging customer ${fanbasesCustomerId} with payment method ${paymentMethodId}`,
    );

    const chargePayload = {
      payment_method_id: paymentMethodId,
      amount_cents,
      description,
      metadata: {
        user_id: user.id,
        product_type,
        product_id,
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
      console.error("Failed to parse charge response as JSON:", responseText);
      return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!chargeResponse.ok || (chargeData.status && chargeData.status !== "success")) {
      console.error("Charge failed:", chargeData);
      return new Response(JSON.stringify({ error: chargeData.message || chargeData.error || "Payment failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chargeId = chargeData.data?.charge_id || chargeData.charge_id || chargeData.id;
    console.log(`[Fanbases Charge] Charge successful: ${chargeId}`);

    // Look up product from fanbases_products table by internal_reference
    // The frontend sends internal references like 'steal-my-script', 'tier1', 'credits_1000'
    // Map credits_X format to X_credits format used in the table
    let lookupRef = product_id;
    if (product_id.startsWith("credits_")) {
      lookupRef = product_id.replace("credits_", "") + "_credits";
    }

    const productMapping = await lookupProductByInternalRef(supabase, lookupRef);

    // Determine processing type from mapping or fallback to request
    const processingType = productMapping?.product_type || product_type;
    const internalRef = productMapping?.internal_reference || product_id;
    const fanbasesProductId = productMapping?.fanbases_product_id;

    console.log(
      `[Fanbases Charge] Processing as: ${processingType}, internal_ref: ${internalRef}, fanbases_id: ${fanbasesProductId}`,
    );

    // Process based on product type
    if (processingType === "module") {
      // Record module purchase with internal_reference as the module slug
      const { error: purchaseError } = await supabase.from("user_purchases").insert({
        user_id: user.id,
        product_id: internalRef,
        product_type: "module",
        amount_cents,
        charge_id: chargeId,
        status: "completed",
      });

      if (purchaseError) {
        console.error("Error recording purchase:", purchaseError);
        // Don't fail - charge was successful
      }

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: 0,
        type: "module_purchase",
        payment_method: "fanbases",
        metadata: { product_id: internalRef, charge_id: chargeId, amount_cents },
      });

      console.log(`[Fanbases Charge] Module ${internalRef} unlocked for user ${user.id}`);
    } else if (processingType === "subscription") {
      // Get tier and credits from mapping or infer from product_id
      const subDetails = getSubscriptionDetails(internalRef);
      const tier = subDetails.tier;
      const monthlyCredits = subDetails.credits;

      // Calculate next renewal
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      // Upsert subscription
      const { error: subError } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          tier,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: renewalDate.toISOString(),
          fanbases_subscription_id: chargeId,
        },
        { onConflict: "user_id" },
      );

      if (subError) {
        console.error("Error updating subscription:", subError);
      }

      // Update user credits and tier
      const { data: userProfile } = await supabase.from("users").select("credits").eq("id", user.id).single();

      const newCredits = (userProfile?.credits || 0) + monthlyCredits;

      await supabase
        .from("users")
        .update({
          subscription_tier: tier,
          credits: newCredits,
        })
        .eq("id", user.id);

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: monthlyCredits,
        type: "subscription",
        payment_method: "fanbases",
        metadata: { tier, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] Subscription ${tier} activated for user ${user.id}`);
    } else if (processingType === "topup") {
      // Get credits from mapping or parse from product_id
      const credits = productMapping ? getTopupCredits(internalRef) : parseInt(product_id.replace("credits_", ""));

      const { data: userProfile } = await supabase.from("users").select("credits").eq("id", user.id).single();

      const newCredits = (userProfile?.credits || 0) + credits;

      await supabase.from("users").update({ credits: newCredits }).eq("id", user.id);

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: credits,
        type: "topup",
        payment_method: "fanbases",
        metadata: { credits, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] ${credits} credits added for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        charge_id: chargeId,
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
