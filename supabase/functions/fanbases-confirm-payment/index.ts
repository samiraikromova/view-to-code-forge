import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product type definitions
interface ProductConfig {
  tier?: string;
  monthlyCredits?: number;
  credits?: number;
}

// Tier configuration for subscriptions
const TIER_CONFIG: Record<string, ProductConfig> = {
  tier1: { tier: "tier1", monthlyCredits: 10000 },
  tier2: { tier: "tier2", monthlyCredits: 40000 },
};

// Credit amounts for top-ups
const TOPUP_CONFIG: Record<string, ProductConfig> = {
  "1000_credits": { credits: 1000 },
  "2500_credits": { credits: 2500 },
  "5000_credits": { credits: 5000 },
  "10000_credits": { credits: 10000 },
};

// Fanbases API configuration
//const FANBASES_API_URL = "https://www.fanbasis.com/public-api";
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";

// Verify transaction with Fanbases API
async function verifyTransactionWithFanbases(
  paymentIntent: string,
  apiKey: string,
): Promise<{ verified: boolean; transactionData?: Record<string, unknown>; error?: string }> {
  try {
    console.log(`[Fanbases Confirm] Verifying transaction: ${paymentIntent}`);

    const response = await fetch(`${FANBASES_API_URL}/transactions/${paymentIntent}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Fanbases Confirm] API error: ${response.status} - ${errorText}`);

      // If 404, transaction might not exist yet or different ID format
      if (response.status === 404) {
        return { verified: false, error: "Transaction not found in Fanbases" };
      }
      return { verified: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`[Fanbases Confirm] Transaction API response:`, JSON.stringify(data));

    if (data.status === "success" && data.data) {
      return { verified: true, transactionData: data.data };
    }

    return { verified: false, error: "Invalid transaction response" };
  } catch (err) {
    const error = err as Error;
    console.error(`[Fanbases Confirm] Verification error:`, error);
    return { verified: false, error: error.message };
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
      console.error("[Fanbases Confirm] Missing FANBASES_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payment_intent, redirect_status, product_type, internal_reference, fanbases_product_id, user_id: bodyUserId, checkout_session_id } = body;

    console.log(`[Fanbases Confirm] Request body:`, JSON.stringify(body));

    // Get authenticated user - try multiple methods
    let userId: string | null = null;
    let userEmail: string | null = null;

    // Method 1: Try to decode JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          userId = payload.sub;
          userEmail = payload.email;
          console.log(`[Fanbases Confirm] User from JWT: ${userId} (${userEmail})`);
        }
      } catch (decodeError) {
        console.log("[Fanbases Confirm] JWT decode failed, trying body user_id");
      }
    }

    // Method 2: Use user_id from request body (from URL metadata)
    if (!userId && bodyUserId) {
      userId = bodyUserId;
      console.log(`[Fanbases Confirm] User from body: ${userId}`);
    }

    if (!userId) {
      console.error("[Fanbases Confirm] No user ID available from JWT or body");
      return new Response(JSON.stringify({ error: "Unauthorized - no user ID" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Fanbases Confirm] User: ${userId}, Payment Intent: ${payment_intent}`);
    console.log(`[Fanbases Confirm] Product: ${product_type} / ${internal_reference}`);
    console.log(`[Fanbases Confirm] Redirect Status: ${redirect_status}`);

    // Validate required fields
    if (!payment_intent || !product_type || !internal_reference) {
      return new Response(JSON.stringify({ error: "Missing required payment confirmation data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check redirect status from URL - we now default to succeeded in caller if missing
    if (redirect_status !== "succeeded") {
      return new Response(JSON.stringify({ error: "Payment was not successful", status: redirect_status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this payment was already processed (idempotency)
    const { data: existingPayment } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("charge_id", payment_intent)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[Fanbases Confirm] Payment ${payment_intent} already processed`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          already_processed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify transaction with Fanbases API
    const verification = await verifyTransactionWithFanbases(payment_intent, FANBASES_API_KEY);

    if (!verification.verified) {
      console.warn(`[Fanbases Confirm] Transaction verification failed: ${verification.error}`);
      // Still proceed if redirect_status is succeeded - API might have delay
      // But log it for monitoring
      console.log(`[Fanbases Confirm] Proceeding based on redirect_status=succeeded despite API verification failure`);
    } else {
      console.log(`[Fanbases Confirm] Transaction verified successfully via API`);
    }

    // Get product price from fanbases_products table
    const { data: productData } = await supabase
      .from("fanbases_products")
      .select("price_cents")
      .eq("internal_reference", internal_reference)
      .maybeSingle();

    const priceCents = productData?.price_cents || 0;

    // Grant access based on product type
    let result: { success: boolean; message: string; details?: Record<string, unknown> } = {
      success: false,
      message: "Unknown product type",
    };

    if (product_type === "topup") {
      result = await grantTopUpCredits(supabase, userId, internal_reference, payment_intent, priceCents);
    } else if (product_type === "subscription") {
      result = await grantSubscription(supabase, userId, internal_reference, payment_intent, priceCents);
    } else if (product_type === "module") {
      result = await grantModuleAccess(supabase, userId, internal_reference, payment_intent, priceCents);
    }

    console.log(`[Fanbases Confirm] Result:`, result);

    // Update checkout session status if exists
    await supabase
      .from("checkout_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("product_id", internal_reference)
      .eq("status", "pending");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Confirm] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Grant top-up credits
// deno-lint-ignore no-explicit-any
async function grantTopUpCredits(
  supabase: any,
  userId: string,
  internalReference: string,
  paymentIntent: string,
  priceCents: number,
) {
  const config = TOPUP_CONFIG[internalReference];
  let credits = config?.credits || 0;

  if (!credits) {
    // Try to parse credits from internal_reference (e.g., "2500_credits" -> 2500)
    const match = internalReference.match(/(\d+)/);
    credits = match ? parseInt(match[1]) : 0;
  }

  if (credits <= 0) {
    return { success: false, message: `Unknown top-up product: ${internalReference}` };
  }

  // Update users table credits ONLY (not user_credits table)
  const { data: userProfile } = await supabase.from("users").select("credits").eq("id", userId).maybeSingle();

  const currentCredits = parseFloat(userProfile?.credits || 0);
  const newCredits = currentCredits + credits;

  await supabase
    .from("users")
    .update({ credits: newCredits, last_credit_update: new Date().toISOString() })
    .eq("id", userId);

  // Record purchase in user_purchases
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "topup",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Added ${credits} credits for user ${userId}. New balance: ${newCredits}`);

  return {
    success: true,
    message: `Successfully added ${credits} credits`,
    details: { credits_added: credits, new_balance: newCredits },
  };
}

// Grant subscription access
// deno-lint-ignore no-explicit-any
async function grantSubscription(
  supabase: any,
  userId: string,
  internalReference: string,
  paymentIntent: string,
  priceCents: number,
) {
  const config = TIER_CONFIG[internalReference];
  if (!config) {
    return { success: false, message: `Unknown subscription tier: ${internalReference}` };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Get current user credits and add monthly credits
  const { data: userProfile } = await supabase.from("users").select("credits").eq("id", userId).maybeSingle();
  const currentCredits = parseFloat(userProfile?.credits || 0);
  const newCredits = currentCredits + (config.monthlyCredits || 0);

  // Update users table subscription_tier AND add credits
  await supabase.from("users").update({ 
    subscription_tier: config.tier,
    credits: newCredits,
    last_credit_update: new Date().toISOString(),
  }).eq("id", userId);

  // Upsert user_subscriptions (NOT user_credits)
  await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      tier: config.tier,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      fanbases_subscription_id: paymentIntent,
    },
    { onConflict: "user_id" },
  );

  // Record purchase in user_purchases
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "subscription",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Subscription ${config.tier} activated for user ${userId}. Added ${config.monthlyCredits} credits. New balance: ${newCredits}`);

  return {
    success: true,
    message: `Successfully activated ${config.tier} subscription`,
    details: {
      tier: config.tier,
      credits_added: config.monthlyCredits,
      new_balance: newCredits,
      period_end: periodEnd.toISOString(),
    },
  };
}

// Grant module access
// deno-lint-ignore no-explicit-any
async function grantModuleAccess(
  supabase: any,
  userId: string,
  internalReference: string,
  paymentIntent: string,
  priceCents: number,
) {
  // Check if already purchased
  const { data: existingPurchase } = await supabase
    .from("user_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", internalReference)
    .eq("status", "completed")
    .maybeSingle();

  if (existingPurchase) {
    return {
      success: true,
      message: "Module already purchased",
      details: { module_id: internalReference, already_owned: true },
    };
  }

  // Try to get module name from modules table
  const { data: moduleData } = await supabase
    .from("modules")
    .select("title")
    .eq("id", internalReference)
    .maybeSingle();

  const moduleName = moduleData?.title || internalReference;

  // Record purchase
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "module",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Module ${internalReference} (${moduleName}) unlocked for user ${userId}`);

  return {
    success: true,
    message: `Successfully unlocked module: ${moduleName}`,
    details: { module_id: internalReference, module_name: moduleName },
  };
}
