// deno-lint-ignore-file no-explicit-any
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Top-up product configuration
const TOPUP_PRODUCT_CONFIG: Record<number, { amount: number; price: number }> = {
  9: { amount: 1000, price: 10 },
  10: { amount: 2500, price: 25 },
  12: { amount: 5000, price: 50 },
  13: { amount: 10000, price: 100 }
};

// Helper to parse form data or JSON
async function parseBody(req: Request): Promise<Record<string, any>> {
  const contentType = req.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return await req.json();
  }
  
  // Form-encoded data
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
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

  // Health check
  if (req.method === 'GET') {
    const THRIVECART_SECRET = Deno.env.get('THRIVECART_SECRET');
    return new Response(JSON.stringify({
      status: 'ThriveCart top-up webhook endpoint is active',
      timestamp: new Date().toISOString(),
      productConfig: {
        9: '1,000 Credits - $10',
        10: '2,500 Credits - $25',
        12: '5,000 Credits - $50',
        13: '10,000 Credits - $100'
      },
      security: THRIVECART_SECRET ? 'Secret configured ✅' : 'Secret NOT configured ❌'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);

      console.log('='.repeat(60));
      console.log('🔔 ThriveCart Top-Up Webhook:', body.event, body.customer?.email);
      console.log('='.repeat(60));

      // Verify secret
      const THRIVECART_SECRET = Deno.env.get('THRIVECART_SECRET');
      if (THRIVECART_SECRET && body.thrivecart_secret !== THRIVECART_SECRET) {
        console.error('❌ Invalid secret');
        return new Response(JSON.stringify({ error: 'Invalid secret' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const event = body.event;
      const email = body.customer?.email || body.customer_email;
      const productId = parseInt(body.base_product);

      if (!email || !productId) {
        console.error('❌ Missing required fields');
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const config = TOPUP_PRODUCT_CONFIG[productId];
      if (!config) {
        console.error(`❌ Unknown product ID: ${productId}`);
        return new Response(JSON.stringify({ error: 'Unknown product' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Initialize Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Find user by email
      const { data: user } = await supabase
        .from('users')
        .select('id, credits')
        .eq('email', email)
        .single();

      if (!user) {
        console.error(`❌ User not found: ${email}`);
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle top-up purchase
      if (event === 'order.success') {
        const newCredits = (Number(user.credits) || 0) + config.amount;

        await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', user.id);

        // Log transaction
        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: config.amount,
          type: 'purchase',
          payment_method: 'thrivecart',
          metadata: {
            order_id: body.order?.id || body.order_id,
            product_id: productId,
            price: config.price
          }
        });

        console.log(`✅ Top-up successful: +${config.amount} credits for ${email}`);
        console.log('='.repeat(60));

        return new Response(JSON.stringify({
          success: true,
          message: 'Credits added',
          credits: newCredits
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle refund
      if (event === 'order.refund') {
        const newCredits = Math.max(0, (Number(user.credits) || 0) - config.amount);

        await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', user.id);

        await supabase.from('credit_transactions').insert({
          user_id: user.id,
          amount: -config.amount,
          type: 'refund',
          payment_method: 'thrivecart',
          metadata: { order_id: body.order?.id || body.order_id, product_id: productId }
        });

        console.log(`💸 Refund processed: -${config.amount} credits for ${email}`);
        console.log('='.repeat(60));

        return new Response(JSON.stringify({
          success: true,
          message: 'Refund processed',
          credits: newCredits
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`⚠️ Event not handled: ${event}`);
      return new Response(JSON.stringify({ success: true, message: 'Event not handled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('❌ Top-up webhook error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
