import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FANBASES_API_URL = 'https://www.fanbasis.com/public-api';

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

    const FANBASES_API_KEY = Deno.env.get('FANBASES_API_KEY');
    if (!FANBASES_API_KEY) {
      console.error('FANBASES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { product_type, product_id, amount_cents, description } = body;

    console.log(`[Fanbases Charge] Type: ${product_type}, Product: ${product_id}, Amount: ${amount_cents} cents, User: ${user.id}`);

    // Get customer and payment method
    const { data: customer, error: customerError } = await supabase
      .from('fanbases_customers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      console.error('Customer not found:', customerError);
      return new Response(
        JSON.stringify({ error: 'No payment method on file. Please add a card first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer.payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'No payment method on file. Please add a card first.', needs_payment_method: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Charge customer via Fanbases API
    console.log(`[Fanbases Charge] Charging customer ${customer.fanbases_customer_id}`);

    const chargeResponse = await fetch(
      `${FANBASES_API_URL}/customers/${customer.fanbases_customer_id}/charge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': FANBASES_API_KEY,
        },
        body: JSON.stringify({
          payment_method_id: customer.payment_method_id,
          amount_cents,
          description,
          metadata: {
            user_id: user.id,
            product_type,
            product_id,
          },
        }),
      }
    );

    const chargeData = await chargeResponse.json();

    if (!chargeResponse.ok || chargeData.status !== 'success') {
      console.error('Charge failed:', chargeData);
      return new Response(
        JSON.stringify({ error: chargeData.message || 'Payment failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chargeId = chargeData.data?.charge_id;
    console.log(`[Fanbases Charge] Charge successful: ${chargeId}`);

    // Process based on product type
    if (product_type === 'module') {
      // Record module purchase
      const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          product_id,
          product_type: 'module',
          amount_cents,
          charge_id: chargeId,
          status: 'completed',
        });

      if (purchaseError) {
        console.error('Error recording purchase:', purchaseError);
        // Don't fail - charge was successful
      }

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: 0,
        type: 'module_purchase',
        payment_method: 'fanbases',
        metadata: { product_id, charge_id: chargeId, amount_cents },
      });

      console.log(`[Fanbases Charge] Module ${product_id} unlocked for user ${user.id}`);

    } else if (product_type === 'subscription') {
      // Update or create subscription
      const tier = product_id; // 'starter' or 'pro'
      const monthlyCredits = tier === 'pro' ? 40000 : 10000;

      // Calculate next renewal
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      // Upsert subscription
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          tier,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: renewalDate.toISOString(),
          fanbases_subscription_id: chargeId,
        }, { onConflict: 'user_id' });

      if (subError) {
        console.error('Error updating subscription:', subError);
      }

      // Update user credits and tier
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      const newCredits = (userProfile?.credits || 0) + monthlyCredits;

      await supabase
        .from('users')
        .update({
          subscription_tier: tier === 'pro' ? 'tier2' : 'tier1',
          credits: newCredits,
        })
        .eq('id', user.id);

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: monthlyCredits,
        type: 'subscription',
        payment_method: 'fanbases',
        metadata: { tier, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] Subscription ${tier} activated for user ${user.id}`);

    } else if (product_type === 'topup') {
      // Add credits
      const credits = parseInt(product_id.replace('credits_', ''));

      const { data: userProfile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      const newCredits = (userProfile?.credits || 0) + credits;

      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id);

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: credits,
        type: 'topup',
        payment_method: 'fanbases',
        metadata: { credits, charge_id: chargeId },
      });

      console.log(`[Fanbases Charge] ${credits} credits added for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        charge_id: chargeId,
        message: 'Payment successful',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err as Error;
    console.error('[Fanbases Charge] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
