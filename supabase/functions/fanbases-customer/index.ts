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
    const { action } = body;

    console.log(`[Fanbases Customer] Action: ${action}, User: ${user.id}`);

    if (action === 'get_or_create') {
      // Check if customer already exists
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('fanbases_customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching customer:', fetchError);
        throw new Error('Failed to fetch customer data');
      }

      if (existingCustomer) {
        console.log(`[Fanbases Customer] Existing customer found: ${existingCustomer.fanbases_customer_id}`);
        return new Response(
          JSON.stringify({
            success: true,
            customer_id: existingCustomer.fanbases_customer_id,
            has_payment_method: !!existingCustomer.payment_method_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', user.id)
        .single();

      const email = userProfile?.email || user.email;
      const name = userProfile?.name || '';

      // Create customer in Fanbases
      console.log(`[Fanbases Customer] Creating new customer for ${email}`);
      
      const customerPayload = {
        email,
        name,
        metadata: { user_id: user.id },
      };
      console.log('[Fanbases Customer] Request payload:', JSON.stringify(customerPayload));
      
      const createResponse = await fetch(`${FANBASES_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': FANBASES_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      });

      const responseText = await createResponse.text();
      console.log('[Fanbases Customer] Raw response:', responseText, 'Status:', createResponse.status);

      if (!createResponse.ok) {
        console.error('Fanbases customer creation failed:', responseText);
        throw new Error(`Failed to create customer in Fanbases: ${responseText}`);
      }

      let createData;
      try {
        createData = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid response from Fanbases API');
      }
      
      const fanbasesCustomerId = createData.data?.id || createData.data?.customer_id || createData.id || createData.customer_id;

      console.log(`[Fanbases Customer] Customer created: ${fanbasesCustomerId}`);

      // Store in our database
      const { error: insertError } = await supabase
        .from('fanbases_customers')
        .insert({
          user_id: user.id,
          fanbases_customer_id: fanbasesCustomerId,
          email,
        });

      if (insertError) {
        console.error('Error storing customer:', insertError);
        throw new Error('Failed to store customer data');
      }

      return new Response(
        JSON.stringify({
          success: true,
          customer_id: fanbasesCustomerId,
          has_payment_method: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'setup_payment_method') {
      // Get customer
      const { data: customer } = await supabase
        .from('fanbases_customers')
        .select('fanbases_customer_id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        return new Response(
          JSON.stringify({ error: 'Customer not found. Please try again.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate setup URL for Fanbases
      // Note: This depends on Fanbases API - may need adjustment based on their docs
      const checkoutUrl = `https://www.fanbasis.com/checkout/setup?customer_id=${customer.fanbases_customer_id}`;

      return new Response(
        JSON.stringify({
          success: true,
          checkout_url: checkoutUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update_payment_method') {
      const { payment_method_id } = body;

      const { error: updateError } = await supabase
        .from('fanbases_customers')
        .update({ payment_method_id, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating payment method:', updateError);
        throw new Error('Failed to update payment method');
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
