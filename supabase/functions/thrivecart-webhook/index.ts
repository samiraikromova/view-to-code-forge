// deno-lint-ignore-file no-explicit-any
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Product configuration with MONTHLY credits
const PRODUCT_CONFIG: Record<number, { tier: string; monthlyCredits: number; price: number }> = {
  7: { tier: 'tier1', monthlyCredits: 10000, price: 29 },
  8: { tier: 'tier2', monthlyCredits: 40000, price: 99 }
};

// Helper to parse form data (ThriveCart sends form-encoded)
async function parseFormData(req: Request): Promise<Record<string, any>> {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      // Handle nested keys like customer[email]
      if (key.includes('[')) {
        const parts = key.split(/\[|\]/).filter(Boolean);
        let current = data;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        data[key] = value;
      }
    }

    // Try to parse JSON strings
    try {
      if (typeof data.customer === "string") data.customer = JSON.parse(data.customer);
      if (typeof data.order === "string") data.order = JSON.parse(data.order);
      if (typeof data.subscriptions === "string") data.subscriptions = JSON.parse(data.subscriptions);
    } catch (err) {
      // Ignore parse errors for non-JSON fields
    }

    return data;
  } catch (err) {
    console.error('Parse error:', err);
    return {};
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ThriveCart pings with HEAD to verify endpoint is alive
  if (req.method === 'HEAD') {
    console.log('🔍 HEAD request received - ThriveCart verification');
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('🔍 GET request to webhook endpoint');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const THRIVECART_SECRET = Deno.env.get('THRIVECART_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        status: 'Error',
        message: 'Missing Supabase credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('users').select('count').limit(1);

    return new Response(JSON.stringify({
      status: 'ThriveCart subscription webhook endpoint is active',
      timestamp: new Date().toISOString(),
      supabaseConnected: !error,
      supportedEvents: [
        'order.success',
        'order.subscription_payment',
        'order.subscription_cancelled',
        'order.subscription_paused',
        'order.subscription_resumed',
        'order.refund'
      ],
      productConfig: {
        7: 'Tier 1 - $29/month - 10,000 credits',
        8: 'Tier 2 - $99/month - 40,000 credits'
      },
      format: 'application/x-www-form-urlencoded',
      security: THRIVECART_SECRET ? 'Secret configured ✅' : 'Secret NOT configured ❌'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    try {
      // 1. Parse form-encoded data
      const body = await parseFormData(req);

      // 2. Enhanced logging
      console.log('='.repeat(60));
      console.log('🔔 ThriveCart Subscription Webhook Received');
      console.log('='.repeat(60));
      console.log('Timestamp:', new Date().toISOString());
      console.log('Mode:', body.mode, `(${body.mode_int === '1' ? 'TEST' : 'LIVE'})`);
      console.log('Event:', body.event);
      console.log('Base Product:', body.base_product);
      console.log('Customer Email:', body.customer?.email);
      console.log('Order ID:', body.order_id);
      console.log('='.repeat(60));

      // 3. Verify ThriveCart secret
      const THRIVECART_SECRET = Deno.env.get('THRIVECART_SECRET');
      if (THRIVECART_SECRET && body.thrivecart_secret !== THRIVECART_SECRET) {
        console.error('❌ Invalid ThriveCart secret');
        return new Response(JSON.stringify({ error: 'Invalid secret' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 4. Extract data
      const email = body.customer?.email || body.customer_email || body.email;
      const productId = parseInt(body.base_product || body.product?.id);
      const event = body.event;
      const mode = body.mode;

      console.log('📧 Extracted Email:', email);
      console.log('🆔 Extracted Product ID:', productId);
      console.log('🎯 Event:', event);

      // 5. Validate required fields
      if (!email) {
        console.error('❌ No email found in webhook');
        return new Response(JSON.stringify({ error: 'Email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!productId || isNaN(productId)) {
        console.error('❌ No valid base_product found in webhook');
        return new Response(JSON.stringify({ error: 'Product ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 6. Get product configuration
      const config = PRODUCT_CONFIG[productId];
      if (!config) {
        console.error(`❌ Unknown product ID: ${productId}`);
        return new Response(JSON.stringify({
          error: `Unknown product ID: ${productId}. Valid IDs: ${Object.keys(PRODUCT_CONFIG).join(', ')}`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`✅ Product Config Found: Tier=${config.tier}, Credits=${config.monthlyCredits}`);

      // 7. Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 8. Find or create user
      console.log(`🔍 Looking for user with email: ${email}`);
      let { data: user } = await supabase
        .from('users')
        .select('id, credits, email, subscription_tier')
        .eq('email', email)
        .maybeSingle();

      if (!user) {
        console.log('⚠️ User not found, creating new user...');
        const customerName = body.customer?.name || body.customer?.first_name || email.split('@')[0];

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: email,
            name: customerName,
            credits: 0,
            subscription_tier: 'free'
          })
          .select()
          .single();

        if (createError || !newUser) {
          console.error('❌ Failed to create user:', createError);
          return new Response(JSON.stringify({
            error: 'User creation failed',
            details: createError?.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        user = newUser;
        console.log('✅ New user created:', newUser.id);
      } else {
        console.log('✅ Existing user found:', user.id);
      }

      console.log(`✅ User ready: ${user.email} (ID: ${user.id}, Current Credits: ${user.credits})`);

      // 9. Handle different webhook events
      switch (event) {
        case 'order.success':
        case 'order.subscription_payment':
          // SUBSCRIPTION ACTIVATION OR RENEWAL
          const isInitial = event === 'order.success';
          console.log(`💳 Processing ${isInitial ? 'initial purchase' : 'subscription renewal'}`);
          console.log(`Current credits: ${user.credits}, Adding: ${config.monthlyCredits}`);

          const newCredits = (user.credits || 0) + config.monthlyCredits;
          const renewalDate = new Date();
          renewalDate.setMonth(renewalDate.getMonth() + 1);

          // Update users table
          const { error: updateError } = await supabase
            .from('users')
            .update({
              subscription_tier: config.tier,
              credits: newCredits
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('❌ Failed to update users table:', updateError);
            return new Response(JSON.stringify({
              error: 'Update failed',
              details: updateError.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          console.log('✅ Users table updated');

          // Update user_credits table
          const { data: existingCredit } = await supabase
            .from('user_credits')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingCredit) {
            await supabase
              .from('user_credits')
              .update({
                tier: config.tier,
                credits: newCredits,
                monthly_allowance: config.monthlyCredits,
                renewal_date: renewalDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          } else {
            await supabase
              .from('user_credits')
              .insert({
                user_id: user.id,
                tier: config.tier,
                credits: newCredits,
                monthly_allowance: config.monthlyCredits,
                renewal_date: renewalDate.toISOString()
              });
          }

          // Log transaction
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: config.monthlyCredits,
            type: 'subscription',
            payment_method: 'thrivecart',
            metadata: {
              product_id: productId,
              tier: config.tier,
              order_id: body.order_id
            }
          });

          console.log(`✅ Credits added: ${config.monthlyCredits} (New total: ${newCredits})`);
          console.log('='.repeat(60));

          return new Response(JSON.stringify({
            success: true,
            message: isInitial ? 'Subscription activated' : 'Subscription renewed',
            credits: newCredits,
            tier: config.tier,
            user_id: user.id,
            mode: mode
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'order.subscription_cancelled':
        case 'order.subscription_paused':
          console.log(`🚫 Processing subscription ${event.includes('cancelled') ? 'cancellation' : 'pause'}`);

          await supabase
            .from('users')
            .update({ subscription_tier: 'free' })
            .eq('id', user.id);

          await supabase
            .from('user_credits')
            .update({
              tier: 'free',
              monthly_allowance: 0,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          console.log(`✅ Subscription ${event.includes('cancelled') ? 'cancelled' : 'paused'}`);
          console.log('='.repeat(60));

          return new Response(JSON.stringify({
            success: true,
            message: `Subscription ${event.includes('cancelled') ? 'cancelled' : 'paused'}`,
            mode: mode
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'order.subscription_resumed':
          console.log('▶️ Processing subscription resume');

          await supabase
            .from('users')
            .update({ subscription_tier: config.tier })
            .eq('id', user.id);

          await supabase
            .from('user_credits')
            .update({
              tier: config.tier,
              monthly_allowance: config.monthlyCredits,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          console.log('✅ Subscription resumed');
          console.log('='.repeat(60));

          return new Response(JSON.stringify({
            success: true,
            message: 'Subscription resumed',
            mode: mode
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'order.refund':
          console.log('💸 Processing refund');

          const creditsToRemove = config.monthlyCredits;
          const newCreditBalance = Math.max(0, (user.credits || 0) - creditsToRemove);

          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              credits: newCreditBalance
            })
            .eq('id', user.id);

          // Log refund transaction
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: -creditsToRemove,
            type: 'refund',
            payment_method: 'thrivecart',
            metadata: { product_id: productId, order_id: body.order_id }
          });

          console.log(`✅ Refund processed. Credits removed: ${creditsToRemove}`);
          console.log('='.repeat(60));

          return new Response(JSON.stringify({
            success: true,
            message: 'Refund processed',
            credits: newCreditBalance,
            mode: mode
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        default:
          console.log(`⚠️ Unhandled event type: ${event}`);
          console.log('='.repeat(60));
          return new Response(JSON.stringify({
            success: true,
            message: `Event ${event} received but not processed`,
            mode: mode
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

    } catch (err) {
      const error = err as Error;
      console.error('='.repeat(60));
      console.error('❌ WEBHOOK ERROR');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('='.repeat(60));

      // Return 200 to avoid ThriveCart retrying
      return new Response(JSON.stringify({
        error: error.message || 'Internal server error'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
