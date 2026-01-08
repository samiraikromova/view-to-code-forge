import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fanbases API base URL - customers are created via checkout flow
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
    const { action } = body;

    console.log(`[Fanbases Customer] v4.0 - Action: ${action}, User: ${user.id}`);

    if (action === 'get_or_create') {
      // Check if customer already exists in our database
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('fanbases_customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching customer:', fetchError);
        throw new Error('Failed to fetch customer data');
      }

      if (existingCustomer?.fanbases_customer_id) {
        console.log(`[Fanbases Customer] Existing customer found: ${existingCustomer.fanbases_customer_id}`);
        
        // Check if they have payment methods via Fanbases API
        let hasPaymentMethod = !!existingCustomer.payment_method_id;
        
        try {
          const pmResponse = await fetch(
            `${FANBASES_API_URL}/customers/${existingCustomer.fanbases_customer_id}/payment-methods`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'x-api-key': FANBASES_API_KEY,
              },
            }
          );
          
          if (pmResponse.ok) {
            const pmData = await pmResponse.json();
            const paymentMethods = pmData.data?.payment_methods || [];
            hasPaymentMethod = paymentMethods.length > 0;
            
            // Update our database with the first payment method if we don't have one stored
            if (hasPaymentMethod && !existingCustomer.payment_method_id) {
              await supabase
                .from('fanbases_customers')
                .update({ 
                  payment_method_id: paymentMethods[0].id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
            }
          }
        } catch (pmError) {
          console.log('[Fanbases Customer] Could not fetch payment methods:', pmError);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            customer_id: existingCustomer.fanbases_customer_id,
            has_payment_method: hasPaymentMethod,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No customer record yet - they need to go through checkout to create one
      // Create a placeholder record so we can track them
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', user.id)
        .single();

      const email = userProfile?.email || user.email;

      // Check if we have a placeholder record already
      if (!existingCustomer) {
        await supabase
          .from('fanbases_customers')
          .upsert({
            user_id: user.id,
            email,
            fanbases_customer_id: null, // Will be populated after checkout
          }, { onConflict: 'user_id' });
      }

      console.log(`[Fanbases Customer] No Fanbases customer yet for ${email}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          customer_id: null,
          has_payment_method: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'setup_payment_method') {
      // Use the fanbases-checkout function for card setup
      // Get user profile for email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', user.id)
        .single();

      const email = userProfile?.email || user.email;

      // Get current origin for redirect
      const origin = req.headers.get('origin') || 'https://app.example.com';
      const returnUrl = `${origin}/pricing/top-up?setup=complete`;

      // Get base URL for webhooks
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const webhookUrl = `${supabaseUrl}/functions/v1/fanbases-webhook`;

      // Create a checkout session for saving a card
      // Fanbases requires minimum 100 cents ($1) - this is a one-time setup fee
      const setupPayload = {
        product: {
          title: 'Card Setup Fee',
          description: 'One-time $1 fee to securely save your card for future purchases',
        },
        amount_cents: 100, // Minimum $1 required by Fanbases API
        type: 'onetime_reusable',
        metadata: {
          user_id: user.id,
          action: 'setup_card',
          email,
        },
        success_url: returnUrl,
        cancel_url: `${origin}/pricing/top-up?setup=cancelled`,
        webhook_url: webhookUrl,
      };

      console.log('[Fanbases Customer] Creating card setup session:', JSON.stringify(setupPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': FANBASES_API_KEY,
        },
        body: JSON.stringify(setupPayload),
      });

      const responseText = await response.text();
      console.log('[Fanbases Customer] Checkout response:', responseText, 'Status:', response.status);

      if (!response.ok) {
        console.error('Failed to create card setup session:', responseText);
        throw new Error(`Failed to create checkout session: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from payment provider');
      }

      const checkoutUrl = data.data?.payment_link || data.data?.url || data.payment_link || data.url;

      if (!checkoutUrl) {
        console.error('No checkout URL in response:', data);
        throw new Error('No checkout URL returned from Fanbases');
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkout_url: checkoutUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update_customer') {
      // Called by webhook when customer completes checkout
      const { fanbases_customer_id, payment_method_id } = body;

      const { error: updateError } = await supabase
        .from('fanbases_customers')
        .update({ 
          fanbases_customer_id,
          payment_method_id, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        throw new Error('Failed to update customer');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err as Error;
    console.error('[Fanbases Customer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
