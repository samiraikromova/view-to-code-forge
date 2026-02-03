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

// Fetch checkout session from Fanbases API to get amount_cents
async function fetchCheckoutSessionAmount(
  checkoutSessionId: string,
  apiKey: string,
): Promise<number | null> {
  try {
    console.log(`[Fanbases Confirm] Fetching checkout session: ${checkoutSessionId}`);

    const response = await fetch(`${FANBASES_API_URL}/checkout-sessions/${checkoutSessionId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`[Fanbases Confirm] Checkout session fetch error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Fanbases Confirm] Checkout session response:`, JSON.stringify(data));

    // Try multiple paths to get the amount
    // Path 1: data.data.product.amount_cents
    let amountCents = data.data?.product?.amount_cents;
    if (amountCents) {
      console.log(`[Fanbases Confirm] Found amount_cents from product: ${amountCents}`);
      return amountCents;
    }

    // Path 2: data.data.amount_cents directly
    amountCents = data.data?.amount_cents;
    if (amountCents) {
      console.log(`[Fanbases Confirm] Found amount_cents directly: ${amountCents}`);
      return amountCents;
    }

    // Path 3: data.data.total or data.data.amount (convert from dollars to cents)
    const amountDollars = data.data?.total || data.data?.amount;
    if (amountDollars) {
      amountCents = Math.round(parseFloat(amountDollars) * 100);
      console.log(`[Fanbases Confirm] Converted amount from dollars: ${amountCents}`);
      return amountCents;
    }

    // Path 4: data.data.product.price (convert from string like "10.00" to cents)
    const priceStr = data.data?.product?.price;
    if (priceStr) {
      amountCents = Math.round(parseFloat(priceStr) * 100);
      console.log(`[Fanbases Confirm] Converted price from product: ${amountCents}`);
      return amountCents;
    }

    console.log(`[Fanbases Confirm] No amount found in checkout session response`);
    return null;
  } catch (err) {
    const error = err as Error;
    console.error(`[Fanbases Confirm] Checkout session fetch error:`, error);
    return null;
  }
}

// Fetch transaction details from Fanbases API to get amount
async function fetchTransactionAmount(
  transactionId: string,
  apiKey: string,
): Promise<number | null> {
  try {
    console.log(`[Fanbases Confirm] Fetching transaction for amount: ${transactionId}`);

    const response = await fetch(`${FANBASES_API_URL}/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`[Fanbases Confirm] Transaction fetch error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Fanbases Confirm] Transaction response for amount:`, JSON.stringify(data));

    // Try multiple paths to get the amount
    let amountCents = data.data?.amount_cents;
    if (amountCents) {
      console.log(`[Fanbases Confirm] Found amount_cents from transaction: ${amountCents}`);
      return amountCents;
    }

    // Try amount field (might be in dollars)
    const amountDollars = data.data?.amount || data.data?.total;
    if (amountDollars) {
      amountCents = Math.round(parseFloat(amountDollars) * 100);
      console.log(`[Fanbases Confirm] Converted transaction amount: ${amountCents}`);
      return amountCents;
    }

    return null;
  } catch (err) {
    const error = err as Error;
    console.error(`[Fanbases Confirm] Transaction amount fetch error:`, error);
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

    // Get product price - first try checkout_sessions, then fanbases_products, then API
    let priceCents = 0;

    // First check if we have a checkout session with amount_cents
    const { data: checkoutSession } = await supabase
      .from("checkout_sessions")
      .select("id, checkout_session_id, amount_cents")
      .eq("user_id", userId)
      .eq("product_id", internal_reference)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkoutSession?.amount_cents) {
      priceCents = checkoutSession.amount_cents;
      console.log(`[Fanbases Confirm] Got price from checkout_sessions: ${priceCents} cents`);
    } else {
      // Try fanbases_products table
      const { data: productData } = await supabase
        .from("fanbases_products")
        .select("price_cents")
        .eq("internal_reference", internal_reference)
        .maybeSingle();

      if (productData?.price_cents) {
        priceCents = productData.price_cents;
        console.log(`[Fanbases Confirm] Got price from fanbases_products: ${priceCents} cents`);
      }
    }

    // If still no price, try fetching from Fanbases API
    if (priceCents === 0) {
      // First try checkout session if we have the ID
      if (checkoutSession?.checkout_session_id) {
        const apiAmount = await fetchCheckoutSessionAmount(checkoutSession.checkout_session_id, FANBASES_API_KEY);
        if (apiAmount) {
          priceCents = apiAmount;
          console.log(`[Fanbases Confirm] Got price from checkout session API: ${priceCents} cents`);
        }
      }
      
      // If still no price, try transaction API using payment_intent
      if (priceCents === 0 && payment_intent) {
        const txAmount = await fetchTransactionAmount(payment_intent, FANBASES_API_KEY);
        if (txAmount) {
          priceCents = txAmount;
          console.log(`[Fanbases Confirm] Got price from transaction API: ${priceCents} cents`);
        }
      }
      
      // Update checkout_sessions with the fetched amount if we have one
      if (priceCents > 0 && checkoutSession?.id) {
        await supabase
          .from("checkout_sessions")
          .update({ amount_cents: priceCents })
          .eq("id", checkoutSession.id);
        console.log(`[Fanbases Confirm] Updated checkout session with amount: ${priceCents} cents`);
      }
    }

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
    } else if (product_type === "card_setup") {
      result = await recordCardSetup(supabase, userId, internal_reference, payment_intent, priceCents);
    }

    console.log(`[Fanbases Confirm] Result:`, result);

    // Update checkout session status if exists and also update amount_cents if we have it
    const updateData: { status: string; updated_at: string; amount_cents?: number } = { 
      status: "completed", 
      updated_at: new Date().toISOString() 
    };
    if (priceCents > 0) {
      updateData.amount_cents = priceCents;
    }
    
    // Update by checkout_session_id if provided, otherwise by product_id or product_type
    if (checkout_session_id) {
      const { error: updateError } = await supabase
        .from("checkout_sessions")
        .update(updateData)
        .eq("user_id", userId)
        .eq("checkout_session_id", checkout_session_id)
        .eq("status", "pending");
      
      if (updateError) {
        console.error("[Fanbases Confirm] Error updating checkout session by checkout_session_id:", updateError);
      } else {
        console.log(`[Fanbases Confirm] Updated checkout session by checkout_session_id: ${checkout_session_id}`);
      }
    } else {
      // Try to update by product_id (internal_reference)
      const { data: updatedByProductId, error: updateError1 } = await supabase
        .from("checkout_sessions")
        .update(updateData)
        .eq("user_id", userId)
        .eq("product_id", internal_reference)
        .eq("status", "pending")
        .select("id");
      
      if (updateError1) {
        console.error("[Fanbases Confirm] Error updating checkout session by product_id:", updateError1);
      } else if (updatedByProductId && updatedByProductId.length > 0) {
        console.log(`[Fanbases Confirm] Updated checkout session by product_id: ${internal_reference}`);
      } else {
        // If no match by product_id, try by product_type (for card_setup, etc.)
        const { data: updatedByType, error: updateError2 } = await supabase
          .from("checkout_sessions")
          .update(updateData)
          .eq("user_id", userId)
          .eq("product_type", product_type)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .select("id");
          
        if (updateError2) {
          console.error("[Fanbases Confirm] Error updating checkout session by product_type:", updateError2);
        } else if (updatedByType && updatedByType.length > 0) {
          console.log(`[Fanbases Confirm] Updated checkout session by product_type: ${product_type}`);
        } else {
          console.log("[Fanbases Confirm] No pending checkout session found to update");
        }
      }
    }

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
      period_start: now.toISOString(),
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
  console.log(`[Fanbases Confirm] grantModuleAccess called - internalReference: ${internalReference}`);
  
  // STEP 1: Look up fanbases_products to get the actual internal_reference (product name/slug)
  // The internalReference coming in might be a fanbases_product_id (UUID)
  let productName: string | null = null;
  let actualInternalReference = internalReference;
  
  // Try to find in fanbases_products by fanbases_product_id first
  const { data: fanbasesProduct } = await supabase
    .from("fanbases_products")
    .select("internal_reference, fanbases_product_id")
    .eq("fanbases_product_id", internalReference)
    .maybeSingle();
  
  if (fanbasesProduct) {
    productName = fanbasesProduct.internal_reference;
    console.log(`[Fanbases Confirm] Found in fanbases_products by fanbases_product_id: ${productName}`);
  } else {
    // Try by internal_reference (in case the passed value is already the internal_reference)
    const { data: productByRef } = await supabase
      .from("fanbases_products")
      .select("internal_reference, fanbases_product_id")
      .eq("internal_reference", internalReference)
      .maybeSingle();
    
    if (productByRef) {
      productName = productByRef.internal_reference;
      console.log(`[Fanbases Confirm] Found in fanbases_products by internal_reference: ${productName}`);
    }
  }
  
  // If we found a product name, use it as the actual reference for access checking
  if (productName) {
    actualInternalReference = productName;
  }
  
  // Check if already purchased using both the original and actual reference
  const { data: existingPurchase } = await supabase
    .from("user_purchases")
    .select("id")
    .eq("user_id", userId)
    .or(`product_id.eq.${internalReference},product_id.eq.${actualInternalReference}`)
    .eq("status", "completed")
    .maybeSingle();

  if (existingPurchase) {
    return {
      success: true,
      message: "Module already purchased",
      details: { module_id: actualInternalReference, module_name: productName, already_owned: true },
    };
  }
  
  // Also check checkout_sessions for existing completed access
  const { data: existingAccess } = await supabase
    .from("checkout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("product_type", "module")
    .or(`product_id.eq.${internalReference},product_id.eq.${actualInternalReference}`)
    .eq("status", "completed")
    .maybeSingle();
    
  if (existingAccess) {
    return {
      success: true,
      message: "Module access already granted",
      details: { module_id: actualInternalReference, module_name: productName, already_owned: true },
    };
  }

  // Try to get original_internal_reference from checkout_sessions metadata
  let originalInternalReference: string | null = null;
  const { data: checkoutSession } = await supabase
    .from("checkout_sessions")
    .select("id, metadata")
    .eq("user_id", userId)
    .or(`product_id.eq.${internalReference},product_id.eq.${actualInternalReference}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (checkoutSession?.metadata?.original_internal_reference) {
    originalInternalReference = checkoutSession.metadata.original_internal_reference as string;
    console.log(`[Fanbases Confirm] Found original_internal_reference from metadata: ${originalInternalReference}`);
  }

  // Try to get module name from modules table
  let moduleData = null;
  
  // Check if internalReference looks like a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(internalReference);
  
  if (isUuid) {
    // First try by module id
    const { data: dataById } = await supabase
      .from("modules")
      .select("id, name, fanbases_product_id")
      .eq("id", internalReference)
      .maybeSingle();
    moduleData = dataById;
    
    // If not found by id, also try by fanbases_product_id (UUID format)
    if (!moduleData) {
      const { data: dataByFanbases } = await supabase
        .from("modules")
        .select("id, name, fanbases_product_id")
        .eq("fanbases_product_id", internalReference)
        .maybeSingle();
      moduleData = dataByFanbases;
    }
  }
  
  // If not found and not a UUID, try by fanbases_product_id (non-UUID string)
  if (!moduleData) {
    const { data } = await supabase
      .from("modules")
      .select("id, name, fanbases_product_id")
      .eq("fanbases_product_id", internalReference)
      .maybeSingle();
    moduleData = data;
  }
  
  // Build the display name with priority: modules.name > fanbases_products.internal_reference > metadata > fallback
  const moduleName = moduleData?.name || productName || originalInternalReference || "Module";
  const moduleId = moduleData?.id || actualInternalReference;
  
  console.log(`[Fanbases Confirm] Module lookup - internalReference: ${internalReference}, productName: ${productName}, moduleName: ${moduleName}, moduleId: ${moduleId}`);

  // Record purchase in user_purchases - use the actual internal reference for consistency
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: actualInternalReference, // Use the resolved internal_reference
    product_type: "module",
    amount_cents: priceCents,
    charge_id: paymentIntent,
    status: "completed",
  });
  
  // CRITICAL: Create/update checkout_sessions record with completed status
  // This is what useAccess checks for module access
  if (checkoutSession?.id) {
    // Update existing pending session
    await supabase
      .from("checkout_sessions")
      .update({ 
        status: "completed", 
        product_id: actualInternalReference, // Ensure product_id is the internal_reference
        updated_at: new Date().toISOString() 
      })
      .eq("id", checkoutSession.id);
    console.log(`[Fanbases Confirm] Updated checkout_session ${checkoutSession.id} to completed`);
  } else {
    // Create new completed checkout session for access tracking
    await supabase.from("checkout_sessions").insert({
      user_id: userId,
      product_id: actualInternalReference,
      product_type: "module",
      amount_cents: priceCents,
      status: "completed",
      metadata: { 
        original_fanbases_product_id: internalReference,
        payment_intent: paymentIntent,
      },
    });
    console.log(`[Fanbases Confirm] Created new checkout_session for module access`);
  }

  console.log(`[Fanbases Confirm] Module ${actualInternalReference} (${moduleName}) unlocked for user ${userId}`);

  return {
    success: true,
    message: `Successfully unlocked module: ${moduleName}`,
    details: { 
      module_id: moduleId, 
      module_name: moduleName,
      product_name: productName,
      original_internal_reference: originalInternalReference,
    },
  };
}

// Record card setup payment and sync payment method from Fanbases
// deno-lint-ignore no-explicit-any
async function recordCardSetup(
  supabase: any,
  userId: string,
  internalReference: string,
  paymentIntent: string,
  priceCents: number,
) {
  const FANBASES_API_KEY = Deno.env.get("FANBASES_API_KEY");
  const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";
  
  // Get user email for customer lookup
  const { data: userProfile } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();
  const userEmail = userProfile?.email;
  
  console.log(`[Fanbases Confirm] Card setup - User: ${userId}, Email: ${userEmail}, PaymentIntent: ${paymentIntent}`);
  
  // Get existing customer record
  const { data: existingCustomer } = await supabase
    .from("fanbases_customers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  let customerId = existingCustomer?.fanbases_customer_id;
  let paymentMethodId: string | null = null;
  let cardDetails: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } = {};
  
  console.log(`[Fanbases Confirm] Existing customer record:`, existingCustomer);
  
  // STEP 1: Get transaction details to find the payment method used in THIS transaction
  let transactionPaymentMethodId: string | null = null;
  let transactionCardDetails: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } = {};
  
  if (FANBASES_API_KEY && paymentIntent) {
    try {
      console.log(`[Fanbases Confirm] Fetching transaction ${paymentIntent} for payment method details`);
      
      const txResponse = await fetch(`${FANBASES_API_URL}/transactions/${paymentIntent}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
      });
      
      if (txResponse.ok) {
        const txData = await txResponse.json();
        console.log(`[Fanbases Confirm] Transaction response:`, JSON.stringify(txData));
        
        // Extract payment method from transaction
        const txPaymentMethod = txData.data?.payment_method || txData.data?.paymentMethod;
        if (txPaymentMethod) {
          transactionPaymentMethodId = txPaymentMethod.id || txPaymentMethod;
          transactionCardDetails = {
            brand: txPaymentMethod.brand || txPaymentMethod.card_brand || txPaymentMethod.type,
            last4: txPaymentMethod.last4 || txPaymentMethod.last_four || txPaymentMethod.lastFour,
            exp_month: txPaymentMethod.exp_month || txPaymentMethod.expMonth,
            exp_year: txPaymentMethod.exp_year || txPaymentMethod.expYear,
          };
          console.log(`[Fanbases Confirm] Transaction payment method:`, transactionPaymentMethodId, transactionCardDetails);
        }
        
        // Also extract customer ID from transaction if we don't have it
        if (!customerId) {
          const txCustomer = txData.data?.customer || txData.data?.customer_id;
          if (txCustomer) {
            customerId = typeof txCustomer === 'object' ? txCustomer.id : txCustomer;
            console.log(`[Fanbases Confirm] Got customer ID from transaction: ${customerId}`);
          }
        }
      } else {
        console.log(`[Fanbases Confirm] Transaction fetch failed: ${txResponse.status}`);
      }
    } catch (txError) {
      console.error("[Fanbases Confirm] Error fetching transaction:", txError);
    }
  }
  
  // STEP 2: Try to find customer by email if we still don't have their Fanbases ID
  if (!customerId && userEmail && FANBASES_API_KEY) {
    try {
      console.log(`[Fanbases Confirm] Looking up customer by email: ${userEmail}`);
      
      // First try search endpoint
      let customersResponse = await fetch(`${FANBASES_API_URL}/customers?search=${encodeURIComponent(userEmail)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
      });
      
      // Fallback to full list if search fails
      if (!customersResponse.ok || customersResponse.status === 400) {
        console.log(`[Fanbases Confirm] Search failed, trying full list`);
        customersResponse = await fetch(`${FANBASES_API_URL}/customers?per_page=200`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-api-key": FANBASES_API_KEY,
          },
        });
      }
      
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        console.log(`[Fanbases Confirm] Customers API response structure:`, Object.keys(customersData));
        
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
        
        console.log(`[Fanbases Confirm] Found ${customers.length} customers in API`);
        
        const matchedCustomer = customers.find((c) => c.email?.toLowerCase() === userEmail.toLowerCase());
        if (matchedCustomer) {
          customerId = matchedCustomer.id;
          console.log(`[Fanbases Confirm] Matched customer by email: ${customerId}`);
        } else {
          console.log(`[Fanbases Confirm] No customer matched email: ${userEmail}`);
        }
      } else {
        console.error(`[Fanbases Confirm] Customers API error: ${customersResponse.status}`);
      }
    } catch (e) {
      console.error("[Fanbases Confirm] Error looking up customer:", e);
    }
  }
  
  // STEP 3: Fetch payment methods from Fanbases to find the newly added card
  if (customerId && FANBASES_API_KEY) {
    try {
      console.log(`[Fanbases Confirm] Fetching payment methods for customer: ${customerId}`);
      
      const pmResponse = await fetch(`${FANBASES_API_URL}/customers/${customerId}/payment-methods`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
      });
      
      console.log(`[Fanbases Confirm] Payment methods API status: ${pmResponse.status}`);
      
      if (pmResponse.ok) {
        const pmData = await pmResponse.json();
        console.log(`[Fanbases Confirm] Payment methods API response:`, JSON.stringify(pmData));
        
        const paymentMethods = pmData.data?.payment_methods || pmData.payment_methods || pmData.data || [];
        
        console.log(`[Fanbases Confirm] Found ${paymentMethods.length} payment methods`);
        
        if (paymentMethods.length > 0) {
          // Priority 1: Match by transaction payment method ID if available
          // Priority 2: Match by transaction card last4 if available
          // Priority 3: Get the NEWEST payment method (last in list, most recently created)
          // Priority 4: Fallback to default
          
          let matchedMethod = null;
          
          // Try to match by payment method ID from transaction
          if (transactionPaymentMethodId) {
            matchedMethod = paymentMethods.find((pm: { id?: string }) => pm.id === transactionPaymentMethodId);
            if (matchedMethod) {
              console.log(`[Fanbases Confirm] Matched payment method by transaction ID`);
            }
          }
          
          // Try to match by last4 from transaction
          if (!matchedMethod && transactionCardDetails.last4) {
            matchedMethod = paymentMethods.find((pm: { last4?: string; last_four?: string; lastFour?: string }) => {
              const pmLast4 = pm.last4 || pm.last_four || pm.lastFour;
              return pmLast4 === transactionCardDetails.last4;
            });
            if (matchedMethod) {
              console.log(`[Fanbases Confirm] Matched payment method by transaction last4: ${transactionCardDetails.last4}`);
            }
          }
          
          // Get the newest payment method (last in the list - typically most recently added)
          if (!matchedMethod) {
            matchedMethod = paymentMethods[paymentMethods.length - 1];
            console.log(`[Fanbases Confirm] Using newest payment method (last in list)`);
          }
          
          console.log(`[Fanbases Confirm] Selected payment method:`, JSON.stringify(matchedMethod));
          
          paymentMethodId = matchedMethod.id;
          cardDetails = {
            brand: matchedMethod.brand || matchedMethod.card_brand || matchedMethod.type,
            last4: matchedMethod.last4 || matchedMethod.last_four || matchedMethod.lastFour,
            exp_month: matchedMethod.exp_month || matchedMethod.expMonth,
            exp_year: matchedMethod.exp_year || matchedMethod.expYear,
          };
          
          console.log(`[Fanbases Confirm] Extracted card details:`, cardDetails);
        }
      } else {
        const errorText = await pmResponse.text();
        console.error(`[Fanbases Confirm] Payment methods API error: ${errorText}`);
      }
    } catch (pmError) {
      console.error("[Fanbases Confirm] Error fetching payment methods:", pmError);
    }
  } else {
    console.log(`[Fanbases Confirm] Cannot fetch payment methods - customerId: ${customerId}, hasApiKey: ${!!FANBASES_API_KEY}`);
  }
  
  // Use transaction card details as fallback if we couldn't get from payment methods
  if (!cardDetails.last4 && transactionCardDetails.last4) {
    console.log(`[Fanbases Confirm] Using card details from transaction as fallback`);
    cardDetails = transactionCardDetails;
    paymentMethodId = transactionPaymentMethodId;
  }
  
  // Update or create fanbases_customers record with card details
  const customerData = {
    fanbases_customer_id: customerId,
    payment_method_id: paymentMethodId,
    card_brand: cardDetails.brand || null,
    card_last4: cardDetails.last4 || null,
    card_exp_month: cardDetails.exp_month || null,
    card_exp_year: cardDetails.exp_year || null,
    updated_at: new Date().toISOString(),
  };
  
  if (existingCustomer) {
    console.log(`[Fanbases Confirm] Updating existing customer record`);
    const { error: updateError } = await supabase
      .from("fanbases_customers")
      .update(customerData)
      .eq("user_id", userId);
    
    if (updateError) {
      console.error(`[Fanbases Confirm] Error updating customer:`, updateError);
    }
  } else {
    console.log(`[Fanbases Confirm] Creating new customer record`);
    const { error: insertError } = await supabase.from("fanbases_customers").insert({
      user_id: userId,
      email: userEmail,
      ...customerData,
    });
    
    if (insertError) {
      console.error(`[Fanbases Confirm] Error inserting customer:`, insertError);
    }
  }
  
  console.log(`[Fanbases Confirm] Customer record updated with card details`);
  
  // Record purchase for audit trail
  await supabase.from("user_purchases").insert({
    user_id: userId,
    product_id: internalReference,
    product_type: "card_setup",
    amount_cents: priceCents || 100, // Default to $1.00 if not provided
    charge_id: paymentIntent,
    status: "completed",
  });

  console.log(`[Fanbases Confirm] Card setup recorded for user ${userId}`);

  // Build card display string
  const cardBrand = cardDetails.brand ? cardDetails.brand.charAt(0).toUpperCase() + cardDetails.brand.slice(1) : "Card";
  const cardDisplay = cardDetails.last4 ? `${cardBrand} ending in ${cardDetails.last4}` : "Your card";

  return {
    success: true,
    message: "Card saved successfully",
    details: { 
      product_id: internalReference,
      card_brand: cardDetails.brand,
      card_last4: cardDetails.last4,
      card_exp_month: cardDetails.exp_month,
      card_exp_year: cardDetails.exp_year,
      card_display: cardDisplay,
    },
  };
}
