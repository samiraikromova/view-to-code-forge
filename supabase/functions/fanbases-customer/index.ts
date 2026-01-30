import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL - Production (NOT sandbox)
//const FANBASES_API_URL = "https://www.fanbasis.com/public-api";
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";

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

    // Get authenticated user by decoding the JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decode JWT payload (base64url encoded)
    let user: { id: string; email: string };
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }
      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      user = { id: payload.sub, email: payload.email };
      console.log(`[Fanbases Customer] Decoded user: ${user.id}`);
    } catch (decodeError) {
      console.error("[Fanbases Customer] JWT decode error:", decodeError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    console.log(`[Fanbases Customer] Action: ${action}, User: ${user.id}`);

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
            const paymentMethods = pmData.data?.payment_methods || [];
            hasPaymentMethod = paymentMethods.length > 0;

            console.log(`[Fanbases Customer] Found ${paymentMethods.length} payment methods`);

            // Update our database with the default payment method
            if (hasPaymentMethod && !existingCustomer.payment_method_id) {
              const defaultMethod =
                paymentMethods.find((pm: { is_default?: boolean }) => pm.is_default) || paymentMethods[0];
              await supabase
                .from("fanbases_customers")
                .update({
                  payment_method_id: defaultMethod.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
              console.log(`[Fanbases Customer] Stored payment method: ${defaultMethod.id}`);
            }
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

      // No customer record yet - create a placeholder
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).maybeSingle();

      const email = userProfile?.email || user.email;

      if (!existingCustomer) {
        await supabase.from("fanbases_customers").upsert(
          {
            user_id: user.id,
            email,
            fanbases_customer_id: null,
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
    } else if (action === "fetch_payment_methods") {
      const { email: providedEmail } = body;

      // Get customer record
      const { data: customer } = await supabase
        .from("fanbases_customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let paymentMethods: Array<{
        id: string;
        type: string;
        last4?: string;
        brand?: string;
        exp_month?: number;
        exp_year?: number;
        is_default?: boolean;
      }> = [];
      let customerId = customer?.fanbases_customer_id;

      // Get user email
      const { data: userProfile } = await supabase.from("users").select("email").eq("id", user.id).maybeSingle();
      const userEmail = providedEmail || userProfile?.email || user.email;

      console.log(
        `[Fanbases Customer] fetch_payment_methods - User: ${user.id}, Email: ${userEmail}, Customer ID: ${customerId}`,
      );

      // If no customer ID, try to find by email
      if (!customerId && userEmail) {
        console.log(`[Fanbases Customer] Looking up customer by email: ${userEmail}`);

        try {
          // Try search first
          let customersResponse = await fetch(`${FANBASES_API_URL}/customers?search=${encodeURIComponent(userEmail)}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": FANBASES_API_KEY,
            },
          });

          // Fallback to getting all customers
          if (!customersResponse.ok || customersResponse.status === 400) {
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

            const matchedCustomer = customers.find((c) => c.email?.toLowerCase() === userEmail.toLowerCase());

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

      // Fetch payment methods if we have a customer ID
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

          if (pmResponse.ok) {
            const pmData = await pmResponse.json();
            paymentMethods = (pmData.data?.payment_methods || []).map(
              (pm: {
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
              }),
            );

            console.log(`[Fanbases Customer] Found ${paymentMethods.length} payment methods`);

            // Update database with default payment method
            if (paymentMethods.length > 0) {
              const defaultMethod = paymentMethods.find((pm) => pm.is_default) || paymentMethods[0];
              await supabase
                .from("fanbases_customers")
                .update({
                  fanbases_customer_id: customerId,
                  payment_method_id: defaultMethod.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
            }
          }
        } catch (pmError) {
          console.error("[Fanbases Customer] Error fetching payment methods:", pmError);
        }
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
    } else if (action === "update_customer") {
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
    } else if (action === "setup_payment_method") {
      // Setup a new payment method via Fanbases checkout
      const { success_url, cancel_url, base_url } = body;
      
      // Get user profile for prefill
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).maybeSingle();
      const email = userProfile?.email || user.email;
      const fullName = userProfile?.name || "";
      
      // Look up the card_setup product
      const { data: cardSetupProduct } = await supabase
        .from("fanbases_products")
        .select("fanbases_product_id, price_cents")
        .eq("internal_reference", "card_setup_fee")
        .maybeSingle();
      
      if (!cardSetupProduct) {
        console.error("[Fanbases Customer] Card setup product not found");
        return new Response(JSON.stringify({ error: "Card setup product not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      console.log(`[Fanbases Customer] Using card setup product: ${cardSetupProduct.fanbases_product_id}`);
      
      // Fetch product list from Fanbases
      const FANBASES_API_KEY = Deno.env.get("FANBASES_API_KEY");
      const productsResponse = await fetch(`${FANBASES_API_URL}/products?per_page=100`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY!,
        },
      });
      
      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error("[Fanbases Customer] Failed to fetch products:", errorText);
        return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const productsData = await productsResponse.json();
      const productsList = productsData.data?.data || productsData.data || [];
      
      // Find the card setup product by fanbases_product_id
      const fanbasesProduct = productsList.find((p: { id: string }) => p.id === cardSetupProduct.fanbases_product_id);
      
      if (!fanbasesProduct || !fanbasesProduct.payment_link) {
        console.error("[Fanbases Customer] Card setup product not found in Fanbases");
        return new Response(JSON.stringify({ error: "Card setup product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Build payment URL with metadata
      const paymentUrl = new URL(fanbasesProduct.payment_link);
      paymentUrl.searchParams.set("metadata[user_id]", user.id);
      paymentUrl.searchParams.set("metadata[product_type]", "card_setup");
      paymentUrl.searchParams.set("metadata[internal_reference]", "card_setup_fee");
      paymentUrl.searchParams.set("metadata[fanbases_product_id]", cardSetupProduct.fanbases_product_id);
      paymentUrl.searchParams.set("prefill[email]", email);
      paymentUrl.searchParams.set("prefill[name]", fullName);
      
      const appBaseUrl = base_url || "https://view-to-code-forge.lovable.app";
      paymentUrl.searchParams.set("success_url", success_url || `${appBaseUrl}/payment-confirm`);
      paymentUrl.searchParams.set("cancel_url", cancel_url || `${appBaseUrl}/settings?setup=cancelled`);
      
      // Store checkout session
      const sessionId = `card_setup_${Date.now()}_${user.id.slice(0, 8)}`;
      await supabase.from("checkout_sessions").insert({
        user_id: user.id,
        checkout_session_id: sessionId,
        payment_link: paymentUrl.toString(),
        product_type: "card_setup",
        product_id: "card_setup_fee",
        amount_cents: cardSetupProduct.price_cents || 0,
        status: "pending",
        metadata: {
          fanbases_product_id: cardSetupProduct.fanbases_product_id,
        },
      });
      
      console.log(`[Fanbases Customer] Card setup URL: ${paymentUrl.toString()}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          payment_link: paymentUrl.toString(),
          checkout_session_id: sessionId,
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
