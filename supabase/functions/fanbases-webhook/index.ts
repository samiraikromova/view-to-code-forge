import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

// Product mapping interface
interface FanbasesProduct {
  fanbases_product_id: string;
  product_type: "module" | "subscription" | "topup" | "card_setup";
  internal_reference: string;
  price_cents: number | null;
}

// HMAC-SHA256 signature validation
async function validateSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}

// Look up product from fanbases_products table
// deno-lint-ignore no-explicit-any
async function lookupProduct(
  supabase: any,
  fanbasesProductId: string
): Promise<FanbasesProduct | null> {
  const { data, error } = await supabase
    .from("fanbases_products")
    .select("fanbases_product_id, product_type, internal_reference, price_cents")
    .eq("fanbases_product_id", fanbasesProductId)
    .maybeSingle();

  if (error) {
    console.error("[Fanbases Webhook] Error looking up product:", error);
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
  // Log ALL webhook calls for debugging
  console.log("[Fanbases Webhook] Received request", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const WEBHOOK_SECRET = Deno.env.get("FANBASES_WEBHOOK_SECRET");

    // Get raw body for signature validation
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";

    console.log("[Fanbases Webhook] Raw body received:", rawBody.substring(0, 500));
    console.log("[Fanbases Webhook] Signature:", signature ? "present" : "missing");

    // Validate signature if secret is configured
    if (WEBHOOK_SECRET && signature) {
      const isValid = await validateSignature(rawBody, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.error("[Fanbases Webhook] Invalid signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[Fanbases Webhook] Signature validated");
    } else {
      console.warn("[Fanbases Webhook] No webhook secret configured - skipping signature validation");
    }

    const payload = JSON.parse(rawBody);
    console.log("[Fanbases Webhook] Event payload:", JSON.stringify(payload));

    // Determine event type from payload
    const eventType = payload.event_type || determineEventType(payload);
    console.log(`[Fanbases Webhook] Processing event: ${eventType}`);

    // Extract common fields
    const buyer = payload.buyer;
    const item = payload.item;
    const subscription = payload.subscription;
    const apiMetadata = payload.api_metadata?.data || payload.metadata || {};

    // Find user by email or metadata
    let userId = apiMetadata.user_id;
    if (!userId && buyer?.email) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("id")
        .eq("email", buyer.email)
        .maybeSingle();
      userId = userByEmail?.id;
    }

    // Also update/create fanbases_customer record if we have buyer info
    if (userId && buyer?.id) {
      console.log(`[Fanbases Webhook] Syncing customer ${buyer.id} for user ${userId}`);
      await supabase
        .from("fanbases_customers")
        .upsert(
          {
            user_id: userId,
            fanbases_customer_id: String(buyer.id),
            email: buyer.email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    }

    if (!userId) {
      console.warn("[Fanbases Webhook] Could not find user for webhook");
      await supabase.from("webhook_logs").insert({
        provider: "fanbases",
        event_type: eventType,
        payload,
        status: "user_not_found",
      });
      return new Response(JSON.stringify({ received: true, warning: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Fanbases Webhook] User found: ${userId}`);

    // Process based on event type
    switch (eventType) {
      case "payment.succeeded": {
        const paymentId = payload.payment_id;
        console.log(`[Fanbases Webhook] Payment succeeded: ${paymentId}`);

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "payment.failed": {
        const failureReason = payload.failure_reason;
        console.error(`[Fanbases Webhook] Payment failed: ${failureReason}`);

        // Could implement retry logic or user notification here
        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "payment.refunded": {
        const refundAmount = payload.refund_amount;
        const originalPaymentId = payload.payment_id;
        console.log(`[Fanbases Webhook] Payment refunded: ${originalPaymentId}, Amount: ${refundAmount}`);

        // Find the original purchase and revoke access
        const { data: purchase } = await supabase
          .from("user_purchases")
          .select("*")
          .eq("charge_id", originalPaymentId)
          .maybeSingle();

        if (purchase) {
          await supabase
            .from("user_purchases")
            .update({ status: "refunded" })
            .eq("id", purchase.id);
          console.log(`[Fanbases Webhook] Revoked access for purchase: ${purchase.id}`);
        }

        // Check if it was a topup and deduct credits
        const { data: creditTx } = await supabase
          .from("credit_transactions")
          .select("*")
          .eq("metadata->>charge_id", originalPaymentId)
          .eq("type", "topup")
          .maybeSingle();

        if (creditTx) {
          // Deduct the credited amount
          const { data: userProfile } = await supabase
            .from("users")
            .select("credits")
            .eq("id", userId)
            .maybeSingle();

          const newCredits = Math.max(0, (userProfile?.credits || 0) - creditTx.amount);
          await supabase.from("users").update({ credits: newCredits }).eq("id", userId);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: -creditTx.amount,
            type: "refund",
            payment_method: "fanbases",
            metadata: { original_charge_id: originalPaymentId, refund_amount: refundAmount },
          });
          console.log(`[Fanbases Webhook] Deducted ${creditTx.amount} credits for refund`);
        }

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "product.purchased": {
        const productPrice = payload.product_price;
        const itemId = item?.id;
        const itemTitle = item?.title;

        console.log(`[Fanbases Webhook] Product purchased: ${itemTitle} (ID: ${itemId})`);

        // Look up product from fanbases_products table
        const productMapping = await lookupProduct(supabase, String(itemId));

        if (!productMapping) {
          console.warn(`[Fanbases Webhook] No product mapping found for: ${itemId}`);
          // Use metadata fallback
          const metaProductType = apiMetadata.product_type;
          const metaInternalRef = apiMetadata.internal_reference;

          if (metaProductType && metaInternalRef) {
            await processProductPurchase(
              supabase,
              userId,
              metaProductType,
              metaInternalRef,
              productPrice,
              payload.payment_id
            );
          } else {
            // Log for manual review
            await supabase.from("webhook_logs").insert({
              provider: "fanbases",
              event_type: eventType,
              payload,
              status: "unmapped_product",
              user_id: userId,
            });
          }
        } else {
          await processProductPurchase(
            supabase,
            userId,
            productMapping.product_type,
            productMapping.internal_reference,
            productPrice,
            payload.payment_id
          );
        }

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "subscription.created": {
        const subId = subscription?.id;
        const startDate = subscription?.start_date;
        const frequency = subscription?.payment_frequency;
        const isFreeTrial = subscription?.is_free_trial;
        const subscriptionProductId = item?.id || subscription?.product_id;

        console.log(`[Fanbases Webhook] Subscription created: ${subId}, Product: ${subscriptionProductId}`);

        // Calculate period end
        const endDate = new Date(startDate);
        if (frequency === "yearly") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        // Look up subscription product
        let tier = "tier1";
        let monthlyCredits = 10000;

        if (subscriptionProductId) {
          const productMapping = await lookupProduct(supabase, String(subscriptionProductId));
          if (productMapping && productMapping.product_type === "subscription") {
            const subDetails = getSubscriptionDetails(productMapping.internal_reference);
            tier = subDetails.tier;
            monthlyCredits = subDetails.credits;
          }
        }

        // Fallback to metadata
        if (apiMetadata.internal_reference) {
          const subDetails = getSubscriptionDetails(apiMetadata.internal_reference);
          tier = subDetails.tier;
          monthlyCredits = subDetails.credits;
        }

        console.log(`[Fanbases Webhook] Subscription tier: ${tier}, credits: ${monthlyCredits}`);

        // Create/update subscription
        await supabase.from("user_subscriptions").upsert(
          {
            user_id: userId,
            tier,
            status: isFreeTrial ? "trialing" : "active",
            current_period_start: startDate,
            current_period_end: endDate.toISOString(),
            fanbases_subscription_id: String(subId),
          },
          { onConflict: "user_id" }
        );

        // Update user credits
        const { data: userProfile } = await supabase
          .from("users")
          .select("credits")
          .eq("id", userId)
          .maybeSingle();

        await supabase
          .from("users")
          .update({
            subscription_tier: tier,
            credits: (userProfile?.credits || 0) + monthlyCredits,
          })
          .eq("id", userId);

        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: monthlyCredits,
          type: "subscription",
          payment_method: "fanbases",
          metadata: { subscription_id: subId, event: "created", tier },
        });

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "subscription.renewed": {
        const subId = subscription?.id;
        const renewedAt = subscription?.renewed_at || new Date().toISOString();

        console.log(`[Fanbases Webhook] Subscription renewed: ${subId}`);

        // Get current subscription
        const { data: currentSub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (currentSub) {
          const newEndDate = new Date(renewedAt);
          newEndDate.setMonth(newEndDate.getMonth() + 1);

          await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              current_period_start: renewedAt,
              current_period_end: newEndDate.toISOString(),
            })
            .eq("user_id", userId);

          // Add renewal credits
          const monthlyCredits = currentSub.tier === "tier2" ? 40000 : 10000;
          const { data: userProfile } = await supabase
            .from("users")
            .select("credits")
            .eq("id", userId)
            .maybeSingle();

          await supabase
            .from("users")
            .update({ credits: (userProfile?.credits || 0) + monthlyCredits })
            .eq("id", userId);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            amount: monthlyCredits,
            type: "subscription",
            payment_method: "fanbases",
            metadata: { subscription_id: subId, event: "renewed" },
          });
        }

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "subscription.canceled": {
        const subId = subscription?.id;
        const cancelledAt = subscription?.cancelled_at || new Date().toISOString();
        const reason = subscription?.cancellation_reason;

        console.log(`[Fanbases Webhook] Subscription cancelled: ${subId}, Reason: ${reason}`);

        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: cancelledAt,
          })
          .eq("user_id", userId);

        // Don't immediately downgrade - let them keep access until period ends
        // The scheduled job should check current_period_end
        console.log(`[Fanbases Webhook] Subscription cancelled but access retained until period end`);

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      case "subscription.expired":
      case "subscription.completed": {
        const subId = subscription?.id;

        console.log(`[Fanbases Webhook] Subscription ended: ${subId}`);

        await supabase
          .from("user_subscriptions")
          .update({ status: "expired" })
          .eq("user_id", userId);

        // Now downgrade the user
        await supabase.from("users").update({ subscription_tier: "free" }).eq("id", userId);

        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "processed",
          user_id: userId,
        });
        break;
      }

      default:
        console.log(`[Fanbases Webhook] Unhandled event type: ${eventType}`);
        await supabase.from("webhook_logs").insert({
          provider: "fanbases",
          event_type: eventType,
          payload,
          status: "unhandled",
          user_id: userId,
        });
    }

    return new Response(JSON.stringify({ received: true, event: eventType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Process product purchase based on type
// deno-lint-ignore no-explicit-any
async function processProductPurchase(
  supabase: any,
  userId: string,
  productType: string,
  internalReference: string,
  priceCents: number,
  chargeId: string
) {
  if (productType === "module") {
    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", internalReference)
      .maybeSingle();

    if (!existingPurchase) {
      await supabase.from("user_purchases").insert({
        user_id: userId,
        product_id: internalReference,
        product_type: "module",
        amount_cents: Math.round(priceCents * 100),
        charge_id: chargeId,
        status: "completed",
      });
      console.log(`[Fanbases Webhook] Module ${internalReference} unlocked for user ${userId}`);
    }
  } else if (productType === "topup") {
    const credits = getTopupCredits(internalReference);

    const { data: userProfile } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .maybeSingle();

    await supabase
      .from("users")
      .update({ credits: (userProfile?.credits || 0) + credits })
      .eq("id", userId);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: credits,
      type: "topup",
      payment_method: "fanbases",
      metadata: { internal_reference: internalReference, charge_id: chargeId },
    });
    console.log(`[Fanbases Webhook] ${credits} credits added for user ${userId}`);
  } else if (productType === "card_setup") {
    // Card setup completed - customer record should already be updated
    console.log(`[Fanbases Webhook] Card setup completed for user ${userId}`);
  }
}

// Helper to determine event type from payload structure
function determineEventType(payload: Record<string, unknown>): string {
  if (payload.refund_amount) return "payment.refunded";
  if (payload.subscription) {
    const sub = payload.subscription as Record<string, unknown>;
    if (sub.cancelled_at) return "subscription.canceled";
    if (sub.completed_at) return "subscription.completed";
    if (sub.expired_at) return "subscription.expired";
    if (sub.renewed_at) return "subscription.renewed";
    if (sub.start_date) return "subscription.created";
  }
  if (payload.product_price !== undefined) return "product.purchased";
  if (payload.failure_reason) return "payment.failed";
  if (payload.payment_id && payload.amount) return "payment.succeeded";
  return "unknown";
}
