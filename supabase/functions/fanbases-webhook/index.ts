import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// HMAC-SHA256 signature validation
async function validateSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const WEBHOOK_SECRET = Deno.env.get('FANBASES_WEBHOOK_SECRET');
    
    // Get raw body for signature validation
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';

    console.log('[Fanbases Webhook] Received webhook');

    // Validate signature if secret is configured
    if (WEBHOOK_SECRET && signature) {
      const isValid = await validateSignature(rawBody, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.error('[Fanbases Webhook] Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[Fanbases Webhook] Signature validated');
    } else {
      console.warn('[Fanbases Webhook] No webhook secret configured - skipping signature validation');
    }

    const payload = JSON.parse(rawBody);
    console.log('[Fanbases Webhook] Event payload:', JSON.stringify(payload));

    // Determine event type from payload
    const eventType = payload.event_type || determineEventType(payload);
    console.log(`[Fanbases Webhook] Processing event: ${eventType}`);

    // Extract common fields
    const buyer = payload.buyer;
    const item = payload.item;
    const subscription = payload.subscription;
    const apiMetadata = payload.api_metadata?.data || {};

    // Find user by email or metadata
    let userId = apiMetadata.user_id;
    if (!userId && buyer?.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', buyer.email)
        .single();
      userId = userByEmail?.id;
    }

    if (!userId) {
      console.warn('[Fanbases Webhook] Could not find user for webhook');
      // Store webhook anyway for manual processing
      await supabase.from('webhook_logs').insert({
        provider: 'fanbases',
        event_type: eventType,
        payload,
        status: 'user_not_found',
      });
      return new Response(
        JSON.stringify({ received: true, warning: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Fanbases Webhook] User found: ${userId}`);

    // Process based on event type
    switch (eventType) {
      case 'payment.succeeded': {
        const amount = payload.amount;
        const paymentId = payload.payment_id;
        
        console.log(`[Fanbases Webhook] Payment succeeded: ${paymentId}, Amount: ${amount}`);
        
        // Log the successful payment
        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'payment.failed': {
        const failureReason = payload.failure_reason;
        console.error(`[Fanbases Webhook] Payment failed: ${failureReason}`);
        
        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'product.purchased': {
        const productPrice = payload.product_price;
        const itemType = item?.type;
        const itemId = item?.id;
        const itemTitle = item?.title;

        console.log(`[Fanbases Webhook] Product purchased: ${itemTitle} (${itemType})`);

        // Record the purchase if not already recorded
        const { data: existingPurchase } = await supabase
          .from('user_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('charge_id', payload.payment_id)
          .maybeSingle();

        if (!existingPurchase) {
          await supabase.from('user_purchases').insert({
            user_id: userId,
            product_id: String(itemId),
            product_type: itemType === 'subscription' ? 'subscription' : 'module',
            amount_cents: Math.round(productPrice * 100),
            charge_id: payload.payment_id,
            status: 'completed',
          });
        }

        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'subscription.created': {
        const subId = subscription?.id;
        const startDate = subscription?.start_date;
        const frequency = subscription?.payment_frequency;
        const isFreeTrial = subscription?.is_free_trial;

        console.log(`[Fanbases Webhook] Subscription created: ${subId}`);

        // Calculate period end based on frequency
        const endDate = new Date(startDate);
        if (frequency === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (frequency === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1); // Default monthly
        }

        // Determine tier from amount or item
        const amount = payload.amount || 0;
        const tier = amount >= 9900 ? 'tier2' : 'tier1';
        const monthlyCredits = tier === 'tier2' ? 40000 : 10000;

        // Create/update subscription
        await supabase.from('user_subscriptions').upsert({
          user_id: userId,
          tier,
          status: isFreeTrial ? 'trialing' : 'active',
          current_period_start: startDate,
          current_period_end: endDate.toISOString(),
          fanbases_subscription_id: String(subId),
        }, { onConflict: 'user_id' });

        // Update user credits
        const { data: userProfile } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        await supabase.from('users').update({
          subscription_tier: tier,
          credits: (userProfile?.credits || 0) + monthlyCredits,
        }).eq('id', userId);

        // Log credit transaction
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: monthlyCredits,
          type: 'subscription',
          payment_method: 'fanbases',
          metadata: { subscription_id: subId, event: 'created' },
        });

        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'subscription.renewed': {
        const subId = subscription?.id;
        const renewedAt = subscription?.renewed_at;

        console.log(`[Fanbases Webhook] Subscription renewed: ${subId}`);

        // Get current subscription
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (currentSub) {
          // Calculate new period end
          const newEndDate = new Date(renewedAt);
          newEndDate.setMonth(newEndDate.getMonth() + 1);

          await supabase.from('user_subscriptions').update({
            status: 'active',
            current_period_start: renewedAt,
            current_period_end: newEndDate.toISOString(),
          }).eq('user_id', userId);

          // Add renewal credits
          const monthlyCredits = currentSub.tier === 'tier2' ? 40000 : 10000;
          const { data: userProfile } = await supabase
            .from('users')
            .select('credits')
            .eq('id', userId)
            .single();

          await supabase.from('users').update({
            credits: (userProfile?.credits || 0) + monthlyCredits,
          }).eq('id', userId);

          await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount: monthlyCredits,
            type: 'subscription',
            payment_method: 'fanbases',
            metadata: { subscription_id: subId, event: 'renewed' },
          });
        }

        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'subscription.canceled': {
        const subId = subscription?.id;
        const cancelledAt = subscription?.cancelled_at;
        const reason = subscription?.cancellation_reason;

        console.log(`[Fanbases Webhook] Subscription cancelled: ${subId}, Reason: ${reason}`);

        await supabase.from('user_subscriptions').update({
          status: 'cancelled',
          cancelled_at: cancelledAt,
        }).eq('user_id', userId);

        // Downgrade user tier
        await supabase.from('users').update({
          subscription_tier: 'free',
        }).eq('id', userId);

        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      case 'subscription.completed': {
        const subId = subscription?.id;
        const completedAt = subscription?.completed_at;

        console.log(`[Fanbases Webhook] Subscription completed: ${subId}`);

        await supabase.from('user_subscriptions').update({
          status: 'completed',
        }).eq('user_id', userId);

        await supabase.from('users').update({
          subscription_tier: 'free',
        }).eq('id', userId);

        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'processed',
          user_id: userId,
        });
        break;
      }

      default:
        console.log(`[Fanbases Webhook] Unhandled event type: ${eventType}`);
        await supabase.from('webhook_logs').insert({
          provider: 'fanbases',
          event_type: eventType,
          payload,
          status: 'unhandled',
          user_id: userId,
        });
    }

    return new Response(
      JSON.stringify({ received: true, event: eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err as Error;
    console.error('[Fanbases Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to determine event type from payload structure
function determineEventType(payload: Record<string, unknown>): string {
  if (payload.subscription) {
    if (payload.subscription && typeof payload.subscription === 'object') {
      const sub = payload.subscription as Record<string, unknown>;
      if (sub.cancelled_at) return 'subscription.canceled';
      if (sub.completed_at) return 'subscription.completed';
      if (sub.renewed_at) return 'subscription.renewed';
      if (sub.start_date) return 'subscription.created';
    }
  }
  if (payload.product_price !== undefined) return 'product.purchased';
  if (payload.failure_reason) return 'payment.failed';
  if (payload.payment_id && payload.amount) return 'payment.succeeded';
  return 'unknown';
}
