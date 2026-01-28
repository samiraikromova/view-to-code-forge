import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      payment_intent,
      redirect_status,
      product_type,
      internal_reference,
      fanbases_product_id,
    } = body;

    console.log(`[Fanbases Confirm] User: ${user.id}, Payment Intent: ${payment_intent}`);
    console.log(`[Fanbases Confirm] Product: ${product_type} / ${internal_reference}`);
    console.log(`[Fanbases Confirm] Redirect Status: ${redirect_status}`);

    // Validate required fields
    if (!payment_intent || !product_type || !internal_reference) {
      return new Response(
        JSON.stringify({ error: "Missing required payment confirmation data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check redirect status
    if (redirect_status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Payment was not successful", status: redirect_status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          already_processed: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      result = await grantTopUpCredits(supabase, user.id, internal_reference, payment_intent, priceCents);
    } else if (product_type === "subscription") {
      result = await grantSubscription(supabase, user.id, internal_reference, payment_intent, priceCents);
    } else if (product_type === "module") {
      result = await grantModuleAccess(supabase, user.id, internal_reference, payment_intent, priceCents);
    }

    console.log(`[Fanbases Confirm] Result:`, result);

    // Update checkout session status if exists
    await supabase
      .from("checkout_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("product_id", internal_reference)
      .eq("status", "pending");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Confirm] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Grant top-up credits
// deno-lint-ignore no-explicit-any
async function grantTopUpCredits(
  supabase: any,
  userId: string,
  internalReference: string,
  paymentIntent: string,
  priceCents: number
) {
  const config = TOPUP_CONFIG[internalReference];
  if (!config || !config.credits) {
    // Try to parse credits from internal_reference
    const match = internalReference.match(/(\d+)/);
    const credits = match ? parseInt(match[1]) : 0;
    
    if (credits <= 0) {
      return { success: false, message: `Unknown top-up product: ${internalReference}` };
    }
    
    return await processTopUp(supabase, userId, credits, paymentIntent, priceCents, internalReference);
  }

  return await processTopUp(supabase, userId, config.credits, paymentIntent, priceCents, internalReference);
}

// deno-lint-ignore no-explicit-any
async function processTopUp(
  supabase: any,
  userId: string,
  credits: number,
  paymentIntent: string,
  priceCents: number,
  internalReference: string
) {
  // Update users table credits
  const { data: userProfile } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .maybeSingle();

  const currentCredits = parseFloat(userProfile?.credits || 0);
  const newCredits = currentCredits + credits;

  await supabase
    .from("users")
    .update({ credits: newCredits, last_credit_update: new Date().toISOString() })
    .eq("id", userId);

  // Also update user_credits table if exists
  const { data: userCreditsData } = await supabase
    .from("user_credits")
    .select("id, credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (userCreditsData) {
    const newUserCredits = parseFloat(userCreditsData.credits || 0) + credits;
    await supabase
      .from("user_credits")
      .update({ credits: newUserCredits })
      .eq("id", userCreditsData.id);
  } else {
    // Create user_credits entry if it doesn't exist
    await supabase.from("user_credits").insert({
      user_id: userId,
      tier: "free",
      credits: credits,
      monthly_allowance: 0,
    });
  }

  // Record purchase in user_purchases
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "topup",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  // Record transaction
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type: "topup",
    payment_method: "fanbases",
    metadata: {
      internal_reference: internalReference,
      charge_id: paymentIntent,
      amount_cents: priceCents,
    },
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
  priceCents: number
) {
  const config = TIER_CONFIG[internalReference];
  if (!config) {
    return { success: false, message: `Unknown subscription tier: ${internalReference}` };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Update users table subscription_tier
  await supabase
    .from("users")
    .update({ subscription_tier: config.tier })
    .eq("id", userId);

  // Upsert user_subscriptions
  await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      tier: config.tier,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      fanbases_subscription_id: paymentIntent,
    },
    { onConflict: "user_id" }
  );

  // Update or create user_credits with monthly allowance
  const { data: userCreditsData } = await supabase
    .from("user_credits")
    .select("id, credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (userCreditsData) {
    await supabase
      .from("user_credits")
      .update({
        tier: config.tier,
        monthly_allowance: config.monthlyCredits,
        renewal_date: periodEnd.toISOString(),
      })
      .eq("id", userCreditsData.id);
  } else {
    await supabase.from("user_credits").insert({
      user_id: userId,
      tier: config.tier!,
      credits: config.monthlyCredits,
      monthly_allowance: config.monthlyCredits,
      renewal_date: periodEnd.toISOString(),
    });
  }

  // Record purchase
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "subscription",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Subscription ${config.tier} activated for user ${userId}`);

  return {
    success: true,
    message: `Successfully activated ${config.tier} subscription`,
    details: {
      tier: config.tier,
      monthly_credits: config.monthlyCredits,
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
  priceCents: number
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
      details: { module: internalReference, already_owned: true },
    };
  }

  // Record purchase
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "module",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Module ${internalReference} unlocked for user ${userId}`);

  return {
    success: true,
    message: `Successfully unlocked module: ${internalReference}`,
    details: { module: internalReference },
  };
}
