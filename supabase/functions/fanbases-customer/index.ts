import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL
// SANDBOX (for testing):
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";
// PRODUCTION (for live):
//const FANBASES_API_URL = 'https://www.fanbasis.com/public-api';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const FANBASES_API_KEY = Deno.env.get("FANBASES_API_KEY");
    if (!FANBASES_API_KEY) {
      console.error("FANBASES_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    console.log(`[Fanbases Customer] v5.0 - Action: ${action}, User: ${user.id}`);

    if (action === "get_or_create") {
      // Check if customer already exists in our database
      const { data: existingCustomer, error: fetchError } = await supabase
        .from("fanbases_customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching customer:", fetchError);
        throw new Error("Failed to fetch customer data");
      }

      if (existingCustomer?.fanbases_customer_id) {
        console.log(`[Fanbases Customer] Existing customer found: ${existingCustomer.fanbases_customer_id}`);

        // Check if they have payment methods via Fanbases API
        let hasPaymentMethod = !!existingCustomer.payment_method_id;

        try {
          const pmResponse = await fetch(
            `${FANBASES_API_URL}/customers/${existingCustomer.fanbases_customer_id}/payment-methods`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "x-api-key": FANBASES_API_KEY,
              },
            },
          );

          if (pmResponse.ok) {
            const pmData = await pmResponse.json();
            console.log("[Fanbases Customer] Payment methods response:", JSON.stringify(pmData));
            
            // Parse according to API schema: data.payment_methods[]
            const paymentMethods = pmData.data?.payment_methods || [];
            hasPaymentMethod = paymentMethods.length > 0;

            console.log(`[Fanbases Customer] Found ${paymentMethods.length} payment methods`);

            // Update our database with the first payment method if we don't have one stored
            if (hasPaymentMethod && !existingCustomer.payment_method_id) {
              const defaultMethod = paymentMethods.find((pm: { is_default?: boolean }) => pm.is_default) || paymentMethods[0];
              await supabase
                .from("fanbases_customers")
                .update({
                  payment_method_id: defaultMethod.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
              console.log(`[Fanbases Customer] Stored payment method: ${defaultMethod.id}`);
            }
          } else {
            const errorText = await pmResponse.text();
            console.log("[Fanbases Customer] Payment methods error:", errorText);
          }
        } catch (pmError) {
          console.log("[Fanbases Customer] Could not fetch payment methods:", pmError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            customer_id: existingCustomer.fanbases_customer_id,
            has_payment_method: hasPaymentMethod,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // No customer record yet - they need to go through checkout to create one
      // Create a placeholder record so we can track them
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();

      const email = userProfile?.email || user.email;

      // Check if we have a placeholder record already
      if (!existingCustomer) {
        await supabase.from("fanbases_customers").upsert(
          {
            user_id: user.id,
            email,
            fanbases_customer_id: null, // Will be populated after checkout
          },
          { onConflict: "user_id" },
        );
      }

      console.log(`[Fanbases Customer] No Fanbases customer yet for ${email}`);

      return new Response(
        JSON.stringify({
          success: true,
          customer_id: null,
          has_payment_method: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "setup_payment_method") {
      // Use the fanbases-checkout function for card setup
      // Get user profile for email
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();

      const email = userProfile?.email || user.email;

      // Get current origin for redirect
      const origin = req.headers.get("origin") || "https://app.example.com";

      // Get base URL for webhooks
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const webhookUrl = `${supabaseUrl}/functions/v1/fanbases-webhook`;

      // Parse user's full name into first and last name
      const fullName = userProfile?.name || "";
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create a checkout session for saving a card
      // Sandbox requires product.title, amount_cents, and type instead of product_id
      // Fanbases uses "fan" object for customer prefill (name, email, phone)
      const setupPayload = {
        product: {
          title: "Card Setup Fee",
          description: "One-time card setup fee",
        },
        amount_cents: 100, // $1 setup fee
        type: "onetime_reusable",
        // Fanbases uses "fan" object for prefilling customer details
        fan: {
          name: fullName || firstName || "Customer",
          email: email,
        },
        // Also include as root-level for compatibility
        customer_email: email,
        customer_name: fullName || firstName,
        metadata: {
          user_id: user.id,
          action: "setup_card",
          email,
        },
        // Include session ID in success URL for syncing
        success_url: `${origin}/settings?setup=complete`,
        cancel_url: `${origin}/settings?setup=cancelled`,
        webhook_url: webhookUrl,
      };

      console.log("[Fanbases Customer] Creating card setup session:", JSON.stringify(setupPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(setupPayload),
      });

      const responseText = await response.text();
      console.log("[Fanbases Customer] Checkout response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create card setup session:", responseText);
        throw new Error(`Failed to create checkout session: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        throw new Error("Invalid response from payment provider");
      }

      const checkoutUrl = data.data?.payment_link || data.data?.url || data.payment_link || data.url;
      const checkoutSessionId = data.data?.id || data.id;

      if (!checkoutUrl) {
        console.error("No checkout URL in response:", data);
        throw new Error("No checkout URL returned from Fanbases");
      }

      console.log(`[Fanbases Customer] Checkout session created: ${checkoutSessionId}`);

      return new Response(
        JSON.stringify({
          success: true,
          checkout_url: checkoutUrl,
          checkout_session_id: checkoutSessionId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "update_customer") {
      // Called by webhook when customer completes checkout
      const { fanbases_customer_id, payment_method_id } = body;

      const { error: updateError } = await supabase
        .from("fanbases_customers")
        .update({
          fanbases_customer_id,
          payment_method_id,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating customer:", updateError);
        throw new Error("Failed to update customer");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "fetch_payment_methods") {
      // Fetch payment methods from Fanbases for a specific checkout session or customer
      const { payment_id } = body;

      // First get the customer record
      const { data: customer } = await supabase
        .from("fanbases_customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let paymentMethods: Array<{ id: string; type: string; last4?: string; brand?: string; exp_month?: number; exp_year?: number; is_default?: boolean }> = [];
      let customerId = customer?.fanbases_customer_id;

      // If we have a payment_id from the redirect, use it to find the customer
      // Fanbases may return customer info in the transaction
      if (payment_id && !customerId) {
        console.log(`[Fanbases Customer] Looking up customer from payment: ${payment_id}`);
        
        // Try to find customer by querying transactions with this payment ID
        // or we can use the /transactions endpoint with payment_id filter
        try {
          // Get unique customers to find the one associated with this user
          const customersResponse = await fetch(`${FANBASES_API_URL}/customers`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": FANBASES_API_KEY,
            },
          });

          if (customersResponse.ok) {
            const customersData = await customersResponse.json();
            console.log("[Fanbases Customer] Customers list:", JSON.stringify(customersData).substring(0, 500));
            
            // Find customer by email
            const { data: userProfile } = await supabase.from("users").select("email").eq("id", user.id).single();
            const userEmail = userProfile?.email || user.email;
            
            const customers = customersData.data?.customers || [];
            const matchedCustomer = customers.find((c: { email?: string }) => c.email?.toLowerCase() === userEmail?.toLowerCase());
            
            if (matchedCustomer) {
              customerId = matchedCustomer.id;
              console.log(`[Fanbases Customer] Found customer by email: ${customerId}`);
              
              // Update our database
              await supabase
                .from("fanbases_customers")
                .update({
                  fanbases_customer_id: customerId,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
            }
          }
        } catch (e) {
          console.error("[Fanbases Customer] Error looking up customer:", e);
        }
      }

      // Now fetch payment methods if we have a customer ID
      if (customerId) {
        console.log(`[Fanbases Customer] Fetching payment methods for customer: ${customerId}`);
        try {
          const pmResponse = await fetch(`${FANBASES_API_URL}/customers/${customerId}/payment-methods`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": FANBASES_API_KEY,
            },
          });

          const pmResponseText = await pmResponse.text();
          console.log("[Fanbases Customer] Payment methods raw response:", pmResponseText);

          if (pmResponse.ok) {
            const pmData = JSON.parse(pmResponseText);
            // Parse according to API schema: data.payment_methods[] with id, type, last4, brand, exp_month, exp_year, is_default
            paymentMethods = (pmData.data?.payment_methods || []).map((pm: {
              id: string;
              type: string;
              last4?: string;
              brand?: string;
              exp_month?: number;
              exp_year?: number;
              is_default?: boolean;
            }) => ({
              id: pm.id,
              type: pm.type,
              last4: pm.last4,
              brand: pm.brand,
              exp_month: pm.exp_month,
              exp_year: pm.exp_year,
              is_default: pm.is_default,
            }));

            console.log(`[Fanbases Customer] Found ${paymentMethods.length} payment methods:`, JSON.stringify(paymentMethods));

            // Update our database with the default or first payment method
            if (paymentMethods.length > 0) {
              const defaultMethod = paymentMethods.find((pm: { is_default?: boolean }) => pm.is_default) || paymentMethods[0];
              await supabase
                .from("fanbases_customers")
                .update({
                  fanbases_customer_id: customerId,
                  payment_method_id: defaultMethod.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
              console.log(`[Fanbases Customer] Stored payment method: ${defaultMethod.id}`);
            }
          } else {
            console.error("[Fanbases Customer] Payment methods error:", pmResponseText);
          }
        } catch (pmError) {
          console.error("[Fanbases Customer] Error fetching payment methods:", pmError);
        }
      } else {
        console.log("[Fanbases Customer] No customer ID found, cannot fetch payment methods");
      }

      return new Response(
        JSON.stringify({
          success: true,
          customer_id: customerId,
          payment_methods: paymentMethods,
          has_payment_method: paymentMethods.length > 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Fanbases Customer] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
