import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL - Production
const FANBASES_API_URL = "https://www.fanbasis.com/public-api";

// Product mapping interface
interface FanbasesProduct {
  id: string;
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup" | "card_setup";
  internal_reference: string;
  price_cents: number | null;
}

// Look up product from fanbases_products table by internal_reference
// deno-lint-ignore no-explicit-any
async function lookupProductByInternalRef(
  supabase: any,
  internalReference: string
): Promise<FanbasesProduct | null> {
  const { data, error } = await supabase
    .from("fanbases_products")
    .select("id, fanbases_product_id, product_type, internal_reference, price_cents")
    .eq("internal_reference", internalReference)
    .maybeSingle();

  if (error) {
    console.error("[Fanbases Checkout] Error looking up product:", error);
    return null;
  }
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
    const { action, internal_reference, success_url, cancel_url } = body;

    console.log(`[Fanbases Checkout] Action: ${action}, Internal Ref: ${internal_reference}, User: ${user.id}`);

    // Get base URL for webhooks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/fanbases-webhook`;

    // Get user profile for metadata
    const { data: userProfile } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", user.id)
      .maybeSingle();
    
    const email = userProfile?.email || user.email || "";
    const fullName = userProfile?.name || "";

    if (action === "create_checkout") {
      // Look up the product from our fanbases_products table
      const product = await lookupProductByInternalRef(supabase, internal_reference);

      if (!product) {
        console.error(`[Fanbases Checkout] Product not found for internal_reference: ${internal_reference}`);
        return new Response(
          JSON.stringify({ error: `Product not found: ${internal_reference}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Fanbases Checkout] Found product: ${product.fanbases_product_id} (${product.product_type})`);

      // Build checkout payload using the existing Fanbases product ID
      const checkoutPayload: Record<string, unknown> = {
        product_id: product.fanbases_product_id,
        metadata: {
          user_id: user.id,
          product_type: product.product_type,
          internal_reference: product.internal_reference,
          email: email,
          name: fullName,
        },
        success_url: success_url || `${body.base_url || "https://app.example.com"}/settings?payment=success&type=${product.product_type}`,
        cancel_url: cancel_url || `${body.base_url || "https://app.example.com"}/settings?payment=cancelled`,
        webhook_url: webhookUrl,
      };

      // Add subscription-specific config if needed
      if (product.product_type === "subscription") {
        checkoutPayload.subscription = {
          frequency_days: 30,
          auto_expire_after_x_periods: null,
        };
      }

      console.log("[Fanbases Checkout] Creating checkout with existing product:", JSON.stringify(checkoutPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const responseText = await response.text();
      console.log("[Fanbases Checkout] Response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create checkout session:", responseText);
        return new Response(
          JSON.stringify({ error: "Failed to create checkout session", details: responseText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkoutSessionId = data.data?.checkout_session_id || data.data?.id;
      const paymentLink = data.data?.payment_link;

      console.log(`[Fanbases Checkout] Session created: ${checkoutSessionId}`);

      // Store checkout session reference
      await supabase.from("checkout_sessions").insert({
        user_id: user.id,
        provider: "fanbases",
        session_id: String(checkoutSessionId),
        product_type: product.product_type,
        product_id: product.internal_reference,
        amount_cents: product.price_cents,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          checkout_session_id: checkoutSessionId,
          payment_link: paymentLink,
          product_type: product.product_type,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "setup_card") {
      // Look up the card_setup product from our fanbases_products table
      const cardSetupProduct = await lookupProductByInternalRef(supabase, "card_setup_fee");

      if (!cardSetupProduct) {
        console.error("[Fanbases Checkout] Card setup product not found in fanbases_products");
        return new Response(
          JSON.stringify({ error: "Card setup product not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Fanbases Checkout] Using card setup product: ${cardSetupProduct.fanbases_product_id}`);

      const setupPayload = {
        product_id: cardSetupProduct.fanbases_product_id,
        metadata: {
          user_id: user.id,
          action: "setup_card",
          email: email,
          name: fullName,
        },
        success_url: success_url || `${body.base_url || "https://app.example.com"}/settings?setup=complete`,
        cancel_url: cancel_url || `${body.base_url || "https://app.example.com"}/settings?setup=cancelled`,
        webhook_url: webhookUrl,
      };

      console.log("[Fanbases Checkout] Creating card setup session:", JSON.stringify(setupPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(setupPayload),
      });

      const responseText = await response.text();
      console.log("[Fanbases Checkout] Card setup response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create card setup session:", responseText);
        return new Response(
          JSON.stringify({ error: "Failed to create card setup session", details: responseText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkout_session_id: data.data?.checkout_session_id || data.data?.id,
          payment_link: data.data?.payment_link,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "one_click_charge") {
      // One-click purchase using saved payment method
      // This requires the user to have a saved payment method and uses fanbases-charge internally
      
      const product = await lookupProductByInternalRef(supabase, internal_reference);
      
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Product not found: ${internal_reference}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get customer's payment method
      const { data: customer } = await supabase
        .from("fanbases_customers")
        .select("fanbases_customer_id, payment_method_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!customer?.fanbases_customer_id || !customer?.payment_method_id) {
        return new Response(
          JSON.stringify({ 
            error: "No payment method on file", 
            needs_payment_method: true,
            redirect_to_checkout: true 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Charge the customer directly
      const chargePayload = {
        payment_method_id: customer.payment_method_id,
        product_id: product.fanbases_product_id,
        metadata: {
          user_id: user.id,
          product_type: product.product_type,
          internal_reference: product.internal_reference,
        },
      };

      console.log(`[Fanbases Checkout] One-click charge for customer ${customer.fanbases_customer_id}:`, JSON.stringify(chargePayload));

      const chargeResponse = await fetch(
        `${FANBASES_API_URL}/customers/${customer.fanbases_customer_id}/charge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-key": FANBASES_API_KEY,
          },
          body: JSON.stringify(chargePayload),
        }
      );

      const chargeText = await chargeResponse.text();
      console.log("[Fanbases Checkout] Charge response:", chargeText, "Status:", chargeResponse.status);

      let chargeData;
      try {
        chargeData = JSON.parse(chargeText);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!chargeResponse.ok || chargeData.status === "error") {
        // If manual rebilling not allowed, fall back to checkout
        if (chargeData.message?.includes("Manual rebilling is not allowed")) {
          console.log("[Fanbases Checkout] Manual rebilling not allowed, redirecting to checkout");
          return new Response(
            JSON.stringify({
              error: "One-click payment not available",
              redirect_to_checkout: true,
              needs_checkout: true,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: chargeData.message || "Payment failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const chargeId = chargeData.data?.charge_id || chargeData.charge_id || chargeData.id;
      console.log(`[Fanbases Checkout] One-click charge successful: ${chargeId}`);

      // Grant access immediately based on product type
      await grantAccess(supabase, user.id, product, chargeId);

      return new Response(
        JSON.stringify({
          success: true,
          charge_id: chargeId,
          product_type: product.product_type,
          message: "Payment successful",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Checkout] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to grant access after successful payment
// deno-lint-ignore no-explicit-any
async function grantAccess(
  supabase: any,
  userId: string,
  product: FanbasesProduct,
  chargeId: string
) {
  console.log(`[Fanbases Checkout] Granting access for ${product.product_type}: ${product.internal_reference}`);

  if (product.product_type === "module") {
    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.internal_reference)
      .maybeSingle();

    if (!existingPurchase) {
      await supabase.from("user_purchases").insert({
        user_id: userId,
        product_id: product.internal_reference,
        product_type: "module",
        amount_cents: product.price_cents,
        charge_id: chargeId,
        status: "completed",
      });
      console.log(`[Fanbases Checkout] Module ${product.internal_reference} unlocked for user ${userId}`);
    }

  } else if (product.product_type === "topup") {
    // Parse credits from internal_reference (e.g., "1000_credits" -> 1000)
    const match = product.internal_reference.match(/(\d+)/);
    const credits = match ? parseInt(match[1]) : 0;

    if (credits > 0) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();

      const newCredits = (userProfile?.credits || 0) + credits;

      await supabase
        .from("users")
        .update({ credits: newCredits })
        .eq("id", userId);

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: credits,
        type: "topup",
        payment_method: "fanbases",
        metadata: { 
          internal_reference: product.internal_reference, 
          charge_id: chargeId,
          amount_cents: product.price_cents 
        },
      });
      console.log(`[Fanbases Checkout] ${credits} credits added for user ${userId}`);
    }

  } else if (product.product_type === "subscription") {
    // Determine tier from internal_reference
    const tierMap: Record<string, { tier: string; credits: number }> = {
      tier1: { tier: "tier1", credits: 10000 },
      tier2: { tier: "tier2", credits: 40000 },
    };
    const subDetails = tierMap[product.internal_reference] || { tier: "tier1", credits: 10000 };

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    await supabase.from("user_subscriptions").upsert(
      {
        user_id: userId,
        tier: subDetails.tier,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: renewalDate.toISOString(),
        fanbases_subscription_id: chargeId,
      },
      { onConflict: "user_id" }
    );

    const { data: userProfile } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();

    await supabase
      .from("users")
      .update({
        subscription_tier: subDetails.tier,
        credits: (userProfile?.credits || 0) + subDetails.credits,
      })
      .eq("id", userId);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: subDetails.credits,
      type: "subscription",
      payment_method: "fanbases",
      metadata: { tier: subDetails.tier, charge_id: chargeId },
    });

    console.log(`[Fanbases Checkout] Subscription ${subDetails.tier} activated for user ${userId}`);
  }
}
