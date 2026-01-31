import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL - Production
//const FANBASES_API_URL = "https://www.fanbasis.com/public-api";
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";

// Product mapping interface
interface FanbasesProduct {
  id: string;
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup" | "card_setup";
  internal_reference: string;
  price_cents: number | null;
}

// Look up product from fanbases_products table by internal_reference OR fanbases_product_id
// deno-lint-ignore no-explicit-any
async function lookupProductByInternalRef(supabase: any, internalReference: string): Promise<FanbasesProduct | null> {
  // First try by internal_reference
  const { data: byInternalRef, error: error1 } = await supabase
    .from("fanbases_products")
    .select("id, fanbases_product_id, product_type, internal_reference, price_cents")
    .eq("internal_reference", internalReference)
    .maybeSingle();

  if (byInternalRef) {
    return byInternalRef;
  }

  // Fallback: try by fanbases_product_id (in case someone passes the Fanbases ID directly)
  const { data: byFanbasesId, error: error2 } = await supabase
    .from("fanbases_products")
    .select("id, fanbases_product_id, product_type, internal_reference, price_cents")
    .eq("fanbases_product_id", internalReference)
    .maybeSingle();

  if (byFanbasesId) {
    console.log(`[Fanbases Checkout] Found product by fanbases_product_id: ${internalReference}`);
    return byFanbasesId;
  }

  if (error1) {
    console.error("[Fanbases Checkout] Error looking up product by internal_reference:", error1);
  }
  if (error2) {
    console.error("[Fanbases Checkout] Error looking up product by fanbases_product_id:", error2);
  }
  return null;
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

    // Get authenticated user by decoding the JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT payload (base64url encoded)
    let user: { id: string; email: string };
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      user = { id: payload.sub, email: payload.email };
      console.log(`[Fanbases Checkout] Decoded user: ${user.id}`);
    } catch (decodeError) {
      console.error("[Fanbases Checkout] JWT decode error:", decodeError);
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
    const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).maybeSingle();

    // Also get auth user metadata for fallback name
    const { data: authUserData } = await supabase.auth.admin.getUserById(user.id);
    const authUserMeta = authUserData?.user?.user_metadata;

    const email = userProfile?.email || user.email || "";
    // Try profile name, then auth metadata full_name, then auth metadata name
    const fullName = userProfile?.name || authUserMeta?.full_name || authUserMeta?.name || "";

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

      console.log(`[Fanbases Checkout] Found product: ${product.fanbases_product_id} (${product.product_type})`);

      // Fetch ALL products from Fanbases using GET /products (list endpoint)
      // Then find the matching product by ID - this avoids 404 on sandbox for single product fetch
      const productsResponse = await fetch(`${FANBASES_API_URL}/products?per_page=100`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
      });

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error(`[Fanbases Checkout] Failed to fetch products list: ${errorText}`);
        return new Response(JSON.stringify({ error: "Failed to fetch products from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productsData = await productsResponse.json();
      const productsList = productsData.data?.data || productsData.data || [];
      
      console.log(`[Fanbases Checkout] Fetched ${productsList.length} products from Fanbases`);

      // Find the matching product by fanbases_product_id
      const fanbasesProduct = productsList.find((p: { id: string }) => p.id === product.fanbases_product_id);
      
      if (!fanbasesProduct) {
        console.error(`[Fanbases Checkout] Product ${product.fanbases_product_id} not found in Fanbases products list`);
        console.log(`[Fanbases Checkout] Available product IDs:`, productsList.map((p: { id: string }) => p.id));
        return new Response(JSON.stringify({ error: `Product ${product.fanbases_product_id} not found in payment provider` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log(`[Fanbases Checkout] Found Fanbases product:`, JSON.stringify(fanbasesProduct));

      // Get the payment link from the product
      const paymentLink = fanbasesProduct.payment_link;
      
      if (!paymentLink) {
        console.error(`[Fanbases Checkout] No payment_link found on product ${product.fanbases_product_id}`);
        return new Response(JSON.stringify({ error: "Product has no payment link configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build the redirect URL with metadata and prefill
      const paymentUrl = new URL(paymentLink);
      
      // Add metadata for webhook/redirect processing
      paymentUrl.searchParams.set("metadata[user_id]", user.id);
      paymentUrl.searchParams.set("metadata[product_type]", product.product_type);
      paymentUrl.searchParams.set("metadata[internal_reference]", product.internal_reference);
      paymentUrl.searchParams.set("metadata[fanbases_product_id]", product.fanbases_product_id);
      
      // Add prefill for user experience
      paymentUrl.searchParams.set("prefill[email]", email);
      paymentUrl.searchParams.set("prefill[name]", fullName);
      
      // Add success/cancel URLs - redirect to payment-confirm page for proper processing
      const appBaseUrl = body.base_url || "https://view-to-code-forge.lovable.app";
      const finalSuccessUrl = success_url || `${appBaseUrl}/payment-confirm`;
      const finalCancelUrl = cancel_url || `${appBaseUrl}/settings?payment=cancelled`;
      
      paymentUrl.searchParams.set("success_url", finalSuccessUrl);
      paymentUrl.searchParams.set("cancel_url", finalCancelUrl);

      console.log(`[Fanbases Checkout] Redirecting to payment link: ${paymentUrl.toString()}`);

      // Get price from Fanbases product (convert from string like "10.00" to cents)
      const priceCents = fanbasesProduct.price 
        ? Math.round(parseFloat(fanbasesProduct.price) * 100) 
        : product.price_cents;

      // Store checkout session reference with price from Fanbases
      const sessionId = `checkout_${Date.now()}_${user.id.slice(0, 8)}`;
      await supabase.from("checkout_sessions").insert({
        user_id: user.id,
        checkout_session_id: sessionId,
        payment_link: paymentUrl.toString(),
        product_type: product.product_type,
        product_id: product.internal_reference,
        amount_cents: priceCents,
        status: "pending",
        metadata: {
          fanbases_product_id: product.fanbases_product_id,
        },
      });
      
      // Sync price to fanbases_products if different
      if (priceCents && priceCents !== product.price_cents) {
        await supabase
          .from("fanbases_products")
          .update({ price_cents: priceCents })
          .eq("id", product.id);
        console.log(`[Fanbases Checkout] Synced price ${priceCents} cents for ${product.internal_reference}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkout_url: paymentUrl.toString(),
          checkout_session_id: sessionId,
          product_type: product.product_type,
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

      console.log(`[Fanbases Checkout] Using card setup product: ${cardSetupProduct.fanbases_product_id}`);

      // Fetch ALL products from Fanbases to get the payment link
      const productsResponse = await fetch(`${FANBASES_API_URL}/products?per_page=100`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
      });

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error(`[Fanbases Checkout] Failed to fetch products list: ${errorText}`);
        return new Response(JSON.stringify({ error: "Failed to fetch products from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productsData = await productsResponse.json();
      const productsList = productsData.data?.data || productsData.data || [];
      
      console.log(`[Fanbases Checkout] Fetched ${productsList.length} products from Fanbases for card setup`);

      // Find the card setup product by fanbases_product_id
      const fanbasesProduct = productsList.find((p: { id: string }) => p.id === cardSetupProduct.fanbases_product_id);
      
      if (!fanbasesProduct) {
        console.error(`[Fanbases Checkout] Card setup product ${cardSetupProduct.fanbases_product_id} not found in Fanbases`);
        console.log(`[Fanbases Checkout] Available product IDs:`, productsList.map((p: { id: string }) => p.id));
        return new Response(JSON.stringify({ error: "Card setup product not found in payment provider" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log(`[Fanbases Checkout] Found card setup product:`, JSON.stringify(fanbasesProduct));

      // Get the payment link from the product
      const paymentLink = fanbasesProduct.payment_link;
      
      if (!paymentLink) {
        console.error(`[Fanbases Checkout] No payment_link found on card setup product`);
        return new Response(JSON.stringify({ error: "Card setup product has no payment link configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get price from Fanbases product (convert from string like "1.00" to cents)
      const cardSetupPriceCents = fanbasesProduct.price 
        ? Math.round(parseFloat(fanbasesProduct.price) * 100) 
        : (cardSetupProduct.price_cents || 100); // Default to $1.00 (100 cents)

      console.log(`[Fanbases Checkout] Card setup price: ${cardSetupPriceCents} cents`);

      // Build the redirect URL with metadata and prefill
      const paymentUrl = new URL(paymentLink);
      
      // Add metadata for webhook/redirect processing
      paymentUrl.searchParams.set("metadata[user_id]", user.id);
      paymentUrl.searchParams.set("metadata[product_type]", "card_setup");
      paymentUrl.searchParams.set("metadata[internal_reference]", cardSetupProduct.internal_reference);
      paymentUrl.searchParams.set("metadata[fanbases_product_id]", cardSetupProduct.fanbases_product_id);
      
      // Add prefill for user experience
      paymentUrl.searchParams.set("prefill[email]", email);
      paymentUrl.searchParams.set("prefill[name]", fullName);
      
      // Add success/cancel URLs - redirect to payment-confirm page for proper processing
      const appBaseUrl = body.base_url || "https://view-to-code-forge.lovable.app";
      // Card setup goes to payment-confirm page just like other payment types
      const finalSuccessUrl = success_url || `${appBaseUrl}/payment-confirm`;
      const finalCancelUrl = cancel_url || `${appBaseUrl}/settings?setup=cancelled`;
      
      paymentUrl.searchParams.set("success_url", finalSuccessUrl);
      paymentUrl.searchParams.set("cancel_url", finalCancelUrl);

      console.log(`[Fanbases Checkout] Redirecting to card setup payment link: ${paymentUrl.toString()}`);

      // Sync price to fanbases_products if different
      if (cardSetupPriceCents && cardSetupPriceCents !== cardSetupProduct.price_cents) {
        await supabase
          .from("fanbases_products")
          .update({ price_cents: cardSetupPriceCents })
          .eq("id", cardSetupProduct.id);
        console.log(`[Fanbases Checkout] Synced card setup price ${cardSetupPriceCents} cents`);
      }

      // Store checkout session reference with actual price from Fanbases
      const sessionId = `card_setup_${Date.now()}_${user.id.slice(0, 8)}`;
      await supabase.from("checkout_sessions").insert({
        user_id: user.id,
        checkout_session_id: sessionId,
        payment_link: paymentUrl.toString(),
        product_type: "card_setup",
        product_id: cardSetupProduct.internal_reference,
        amount_cents: cardSetupPriceCents,
        status: "pending",
        metadata: {
          fanbases_product_id: cardSetupProduct.fanbases_product_id,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          checkout_session_id: sessionId,
          payment_link: paymentUrl.toString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "one_click_charge") {
      // One-click purchase using saved payment method
      // This requires the user to have a saved payment method and uses fanbases-charge internally

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
        // If manual rebilling not allowed, fall back to checkout
        if (chargeData.message?.includes("Manual rebilling is not allowed")) {
          console.log("[Fanbases Checkout] Manual rebilling not allowed, redirecting to checkout");
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
      { onConflict: "user_id" },
    );

    const { data: userProfile } = await supabase.from("users").select("credits").eq("id", userId).maybeSingle();

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
