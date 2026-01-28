import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API - PRODUCTION URL (required for checkout)
const FANBASES_API_URL = "https://www.fanbasis.com/public-api";

// Product mapping interface
interface FanbasesProduct {
  id: string;
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup" | "card_setup";
  internal_reference: string;
  price_cents: number | null;
}

// Fanbases API Product from GET /products
interface FanbasesAPIProduct {
  id: string;
  title: string;
  internal_name: string | null;
  description: string | null;
  price: number; // This is the price in dollars (e.g., 10.00)
  payment_link: string;
}

// Look up product from fanbases_products table by internal_reference
// deno-lint-ignore no-explicit-any
async function lookupProductByInternalRef(supabase: any, internalReference: string): Promise<FanbasesProduct | null> {
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

// Fetch product from Fanbases API to get the payment_link and current price
async function fetchProductFromFanbasesAPI(apiKey: string, fanbasesProductId: string): Promise<FanbasesAPIProduct | null> {
  console.log(`[Fanbases Checkout] Fetching product ${fanbasesProductId} from Fanbases API`);
  
  try {
    const response = await fetch(`${FANBASES_API_URL}/products?per_page=100`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    const responseText = await response.text();
    console.log(`[Fanbases Checkout] Products API response status: ${response.status}`);

    if (!response.ok) {
      console.error("[Fanbases Checkout] Failed to fetch products:", responseText);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[Fanbases Checkout] Failed to parse products response");
      return null;
    }

    // The API returns { status, message, data: { current_page, data: [...products], ... } }
    const products = data.data?.data || [];
    console.log(`[Fanbases Checkout] Found ${products.length} products`);

    // Find the product by ID
    const product = products.find((p: FanbasesAPIProduct) => p.id === fanbasesProductId);
    
    if (product) {
      console.log(`[Fanbases Checkout] Found product: ${product.title}, price: ${product.price}, link: ${product.payment_link}`);
    } else {
      console.log(`[Fanbases Checkout] Product ${fanbasesProductId} not found in API response`);
      // Log available product IDs for debugging
      console.log(`[Fanbases Checkout] Available product IDs: ${products.map((p: FanbasesAPIProduct) => p.id).join(', ')}`);
    }

    return product || null;
  } catch (err) {
    console.error("[Fanbases Checkout] Error fetching product from API:", err);
    return null;
  }
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
    const { action, internal_reference, success_url, cancel_url, base_url } = body;

    console.log(`[Fanbases Checkout] Action: ${action}, Internal Ref: ${internal_reference}, User: ${user.id}`);

    // Get user profile for autofill
    const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).maybeSingle();

    const email = userProfile?.email || user.email || "";
    const fullName = userProfile?.name || user.user_metadata?.full_name || "";

    if (action === "create_checkout") {
      // Look up the product from our fanbases_products table
      const product = await lookupProductByInternalRef(supabase, internal_reference);

      if (!product) {
        console.error(`[Fanbases Checkout] Product not found for internal_reference: ${internal_reference}`);
        return new Response(JSON.stringify({ error: `Product not found: ${internal_reference}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[Fanbases Checkout] Found local product: ${product.fanbases_product_id} (${product.product_type})`);

      // Fetch the product from Fanbases API to get the payment_link
      const fanbasesProduct = await fetchProductFromFanbasesAPI(FANBASES_API_KEY, product.fanbases_product_id);

      if (!fanbasesProduct || !fanbasesProduct.payment_link) {
        console.error(`[Fanbases Checkout] Could not get payment_link for product ${product.fanbases_product_id}`);
        return new Response(JSON.stringify({ error: "Payment link not available for this product" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build the payment link with metadata and prefill data
      const paymentLinkUrl = new URL(fanbasesProduct.payment_link);
      
      // Add metadata for webhook processing
      paymentLinkUrl.searchParams.set("metadata[user_id]", user.id);
      paymentLinkUrl.searchParams.set("metadata[product_type]", product.product_type);
      paymentLinkUrl.searchParams.set("metadata[internal_reference]", product.internal_reference);
      paymentLinkUrl.searchParams.set("metadata[fanbases_product_id]", product.fanbases_product_id);
      
      // Add prefill data for form autofill
      if (email) {
        paymentLinkUrl.searchParams.set("prefill[email]", email);
      }
      if (fullName) {
        paymentLinkUrl.searchParams.set("prefill[name]", fullName);
      }

      // Add success/cancel URLs if provided
      if (success_url) {
        paymentLinkUrl.searchParams.set("success_url", success_url);
      }
      if (cancel_url) {
        paymentLinkUrl.searchParams.set("cancel_url", cancel_url);
      }

      const finalPaymentLink = paymentLinkUrl.toString();
      console.log(`[Fanbases Checkout] Using payment link: ${finalPaymentLink}`);

      // Store checkout attempt for tracking
      try {
        await supabase.from("checkout_sessions").insert({
          user_id: user.id,
          provider: "fanbases",
          session_id: `link_${Date.now()}`,
          product_type: product.product_type,
          product_id: product.internal_reference,
          amount_cents: Math.round(fanbasesProduct.price * 100),
          status: "pending",
        });
      } catch (err) {
        console.log("[Fanbases Checkout] Failed to store session:", err);
      }

      // Update local product price_cents if it differs
      const priceCents = Math.round(fanbasesProduct.price * 100);
      if (product.price_cents !== priceCents) {
        try {
          await supabase
            .from("fanbases_products")
            .update({ price_cents: priceCents })
            .eq("id", product.id);
        } catch (err) {
          console.log("[Fanbases Checkout] Failed to update price:", err);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_link: finalPaymentLink,
          product_type: product.product_type,
          amount_cents: priceCents,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "setup_card") {
      // Look up the card_setup product from our fanbases_products table
      const cardSetupProduct = await lookupProductByInternalRef(supabase, "card_setup_fee");

      if (!cardSetupProduct) {
        console.error("[Fanbases Checkout] Card setup product not found in fanbases_products");
        return new Response(JSON.stringify({ error: "Card setup product not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the card setup product from Fanbases API
      const fanbasesProduct = await fetchProductFromFanbasesAPI(FANBASES_API_KEY, cardSetupProduct.fanbases_product_id);

      if (!fanbasesProduct || !fanbasesProduct.payment_link) {
        console.error(`[Fanbases Checkout] Could not get payment_link for card setup product`);
        return new Response(JSON.stringify({ error: "Card setup not available" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build the payment link with metadata
      const paymentLinkUrl = new URL(fanbasesProduct.payment_link);
      paymentLinkUrl.searchParams.set("metadata[user_id]", user.id);
      paymentLinkUrl.searchParams.set("metadata[action]", "setup_card");
      
      if (email) {
        paymentLinkUrl.searchParams.set("prefill[email]", email);
      }
      if (fullName) {
        paymentLinkUrl.searchParams.set("prefill[name]", fullName);
      }

      const successUrlFinal = success_url || `${base_url || "https://app.example.com"}/settings?setup=complete`;
      const cancelUrlFinal = cancel_url || `${base_url || "https://app.example.com"}/settings?setup=cancelled`;
      
      paymentLinkUrl.searchParams.set("success_url", successUrlFinal);
      paymentLinkUrl.searchParams.set("cancel_url", cancelUrlFinal);

      const finalPaymentLink = paymentLinkUrl.toString();
      console.log(`[Fanbases Checkout] Card setup payment link: ${finalPaymentLink}`);

      return new Response(
        JSON.stringify({
          success: true,
          payment_link: finalPaymentLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "one_click_charge") {
      // One-click purchase using saved payment method
      const product = await lookupProductByInternalRef(supabase, internal_reference);

      if (!product) {
        return new Response(JSON.stringify({ error: `Product not found: ${internal_reference}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get customer's payment method
      const { data: customer } = await supabase
        .from("fanbases_customers")
        .select("fanbases_customer_id, payment_method_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!customer?.fanbases_customer_id || !customer?.payment_method_id) {
        // No payment method - redirect to checkout instead
        const fanbasesProduct = await fetchProductFromFanbasesAPI(FANBASES_API_KEY, product.fanbases_product_id);
        
        if (fanbasesProduct?.payment_link) {
          const paymentLinkUrl = new URL(fanbasesProduct.payment_link);
          paymentLinkUrl.searchParams.set("metadata[user_id]", user.id);
          paymentLinkUrl.searchParams.set("metadata[product_type]", product.product_type);
          paymentLinkUrl.searchParams.set("metadata[internal_reference]", product.internal_reference);
          
          if (email) paymentLinkUrl.searchParams.set("prefill[email]", email);
          if (fullName) paymentLinkUrl.searchParams.set("prefill[name]", fullName);

          return new Response(
            JSON.stringify({
              error: "No payment method on file",
              needs_payment_method: true,
              redirect_to_checkout: true,
              payment_link: paymentLinkUrl.toString(),
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            error: "No payment method on file",
            needs_payment_method: true,
            redirect_to_checkout: true,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

      console.log(
        `[Fanbases Checkout] One-click charge for customer ${customer.fanbases_customer_id}:`,
        JSON.stringify(chargePayload),
      );

      const chargeResponse = await fetch(`${FANBASES_API_URL}/customers/${customer.fanbases_customer_id}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(chargePayload),
      });

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
        // If manual rebilling not allowed, fall back to checkout via payment link
        if (chargeData.message?.includes("Manual rebilling is not allowed")) {
          console.log("[Fanbases Checkout] Manual rebilling not allowed, redirecting to checkout");
          
          const fanbasesProduct = await fetchProductFromFanbasesAPI(FANBASES_API_KEY, product.fanbases_product_id);
          if (fanbasesProduct?.payment_link) {
            const paymentLinkUrl = new URL(fanbasesProduct.payment_link);
            paymentLinkUrl.searchParams.set("metadata[user_id]", user.id);
            paymentLinkUrl.searchParams.set("metadata[product_type]", product.product_type);
            paymentLinkUrl.searchParams.set("metadata[internal_reference]", product.internal_reference);
            
            if (email) paymentLinkUrl.searchParams.set("prefill[email]", email);
            if (fullName) paymentLinkUrl.searchParams.set("prefill[name]", fullName);

            return new Response(
              JSON.stringify({
                error: "One-click payment not available",
                redirect_to_checkout: true,
                needs_checkout: true,
                payment_link: paymentLinkUrl.toString(),
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({
              error: "One-click payment not available",
              redirect_to_checkout: true,
              needs_checkout: true,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ error: chargeData.message || "Payment failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
async function grantAccess(supabase: any, userId: string, product: FanbasesProduct, chargeId: string) {
  console.log(`[Fanbases Checkout] Granting access for ${product.product_type}: ${product.internal_reference}`);

  if (product.product_type === "module") {
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
    const match = product.internal_reference.match(/(\d+)/);
    const credits = match ? parseInt(match[1]) : 0;

    if (credits > 0) {
      const { data: userProfile } = await supabase.from("users").select("credits").eq("id", userId).maybeSingle();

      const newCredits = (userProfile?.credits || 0) + credits;

      await supabase.from("users").update({ credits: newCredits }).eq("id", userId);

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: credits,
        type: "topup",
        payment_method: "fanbases",
        metadata: {
          internal_reference: product.internal_reference,
          charge_id: chargeId,
          amount_cents: product.price_cents,
        },
      });
      console.log(`[Fanbases Checkout] ${credits} credits added for user ${userId}`);
    }
  } else if (product.product_type === "subscription") {
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
        current_period_end: renewalDate.toISOString(),
        charge_id: chargeId,
      },
      { onConflict: "user_id" },
    );

    // Update user tier and add monthly credits
    const { data: userProfile } = await supabase.from("users").select("credits").eq("id", userId).maybeSingle();

    await supabase
      .from("users")
      .update({
        subscription_tier: subDetails.tier,
        credits: (userProfile?.credits || 0) + subDetails.credits,
      })
      .eq("id", userId);

    console.log(`[Fanbases Checkout] Subscription ${subDetails.tier} activated for user ${userId}`);
  }
}
