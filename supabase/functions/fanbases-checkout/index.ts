import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fanbases API base URL - Production
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
    const { action, product_type, product_id, amount_cents, title, description, success_url } = body;

    console.log(`[Fanbases Checkout] Action: ${action}, Product: ${product_id}, User: ${user.id}`);

    // Get base URL for webhooks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/fanbases-webhook`;

    if (action === "create_checkout") {
      // Create a checkout session for one-time or subscription purchase

      // Get user profile for prefilling
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();
      const email = userProfile?.email || user.email;
      const fullName = userProfile?.name || "";

      const isSubscription = product_type === "subscription";

      // Build payload according to Fanbases API docs - only documented fields
      const checkoutPayload: Record<string, unknown> = {
        product: {
          title: title || `${product_type}: ${product_id}`,
          description: description || `Purchase for ${email}`,
        },
        amount_cents: amount_cents,
        type: isSubscription ? "subscription" : "onetime_non_reusable",
        metadata: {
          user_id: user.id,
          product_type,
          product_id,
          email: email,
          name: fullName,
        },
        success_url: success_url || `${body.base_url || "https://app.example.com"}/payment-success`,
        webhook_url: webhookUrl,
      };

      // Add subscription details if needed
      if (isSubscription) {
        checkoutPayload.subscription = {
          frequency_days: 30, // Monthly
          auto_expire_after_x_periods: null, // Don't auto-expire
        };
      }

      console.log("[Fanbases Checkout] Creating checkout session:", JSON.stringify(checkoutPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(checkoutPayload),
      });

      const responseText = await response.text();
      console.log("[Fanbases Checkout] Response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create checkout session:", responseText);
        return new Response(JSON.stringify({ error: "Failed to create checkout session", details: responseText }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkoutSessionId = data.data?.checkout_session_id;
      const paymentLink = data.data?.payment_link;

      console.log(`[Fanbases Checkout] Session created: ${checkoutSessionId}`);

      // Store checkout session reference
      await supabase.from("checkout_sessions").insert({
        user_id: user.id,
        provider: "fanbases",
        session_id: String(checkoutSessionId),
        product_type,
        product_id,
        amount_cents,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          checkout_session_id: checkoutSessionId,
          payment_link: paymentLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "create_embedded_checkout") {
      // Create an embedded checkout session

      // Get user profile for prefilling
      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();
      const email = userProfile?.email || user.email;
      const fullName = userProfile?.name || "";

      // Build payload according to Fanbases API docs - only documented fields
      const embeddedPayload: Record<string, unknown> = {
        product: {
          title: title || `${product_type}: ${product_id}`,
          description: description || `Purchase for ${email}`,
        },
        amount_cents: amount_cents,
        type: product_type === "subscription" ? "subscription" : "onetime_non_reusable",
        metadata: {
          user_id: user.id,
          product_type,
          product_id,
          email: email,
          name: fullName,
        },
        webhook_url: webhookUrl,
      };

      if (product_type === "subscription") {
        (embeddedPayload as Record<string, unknown>).subscription = {
          frequency_days: 30,
        };
      }

      console.log("[Fanbases Checkout] Creating embedded checkout:", JSON.stringify(embeddedPayload));

      const response = await fetch(`${FANBASES_API_URL}/checkout-sessions/embedded`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": FANBASES_API_KEY,
        },
        body: JSON.stringify(embeddedPayload),
      });

      const responseText = await response.text();
      console.log("[Fanbases Checkout] Embedded response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create embedded checkout:", responseText);
        return new Response(JSON.stringify({ error: "Failed to create embedded checkout", details: responseText }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: data.data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "setup_card") {
      // Create a checkout session specifically for saving a card (card-on-file)

      const { data: userProfile } = await supabase.from("users").select("email, name").eq("id", user.id).single();
      const email = userProfile?.email || user.email;
      const fullName = userProfile?.name || "";

      // Build payload according to Fanbases API docs - only documented fields
      const setupPayload = {
        product: {
          title: "Save Payment Method",
          description: `Card setup for ${email}`,
        },
        amount_cents: 100, // Small amount for card validation
        type: "onetime_reusable", // Reusable for future charges
        metadata: {
          user_id: user.id,
          action: "setup_card",
          email: email,
          name: fullName,
        },
        success_url: success_url || `${body.base_url || "https://app.example.com"}/card-saved`,
        webhook_url: webhookUrl,
      };

      console.log("[Fanbases Checkout] Creating card setup session:", JSON.stringify(setupPayload));

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
      console.log("[Fanbases Checkout] Card setup response:", responseText, "Status:", response.status);

      if (!response.ok) {
        console.error("Failed to create card setup session:", responseText);
        return new Response(JSON.stringify({ error: "Failed to create card setup session", details: responseText }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Failed to parse response:", responseText);
        return new Response(JSON.stringify({ error: "Invalid response from payment provider" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkout_session_id: data.data?.checkout_session_id,
          payment_link: data.data?.payment_link,
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
    console.error("[Fanbases Checkout] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
