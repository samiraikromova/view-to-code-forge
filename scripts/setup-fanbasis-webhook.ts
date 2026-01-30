/**
 * Fanbasis Webhook Setup Script
 *
 * Run this script to register a webhook subscription with Fanbasis.
 * This ensures your app receives real-time payment notifications.
 *
 * Usage:
 * 1. Set environment variables:
 *    - VITE_SUPABASE_URL: Your Supabase project URL
 *    - FANBASES_API_KEY: Your Fanbasis API key
 *
 * 2. Run with Deno or Node.js:
 *    deno run --allow-net --allow-env scripts/setup-fanbasis-webhook.ts
 *
 * Or manually call the API using curl/Postman with your API key.
 */

// const FANBASES_API_URL = "https://www.fanbasis.com/public-api";
// Use QA for testing:
const FANBASES_API_URL = "https://qa.dev-fan-basis.com/public-api";

async function setupWebhook() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || Deno.env.get("VITE_SUPABASE_URL");
  const fanbasesApiKey = process.env.FANBASES_API_KEY || Deno.env.get("FANBASES_API_KEY");

  if (!supabaseUrl || !fanbasesApiKey) {
    console.error("Missing required environment variables:");
    console.error("- VITE_SUPABASE_URL:", supabaseUrl ? "set" : "missing");
    console.error("- FANBASES_API_KEY:", fanbasesApiKey ? "set" : "missing");
    return;
  }

  const webhookUrl = `${supabaseUrl}/functions/v1/fanbases-webhook`;

  console.log("Setting up webhook...");
  console.log("Webhook URL:", webhookUrl);

  try {
    // First, check existing webhooks
    const listResponse = await fetch(`${FANBASES_API_URL}/webhook-subscriptions`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": fanbasesApiKey,
      },
    });

    const listData = await listResponse.json();
    console.log("Existing webhooks:", JSON.stringify(listData, null, 2));

    // Check if our webhook already exists
    const existingWebhook = listData.data?.find((w: { webhook_url: string }) => w.webhook_url === webhookUrl);

    if (existingWebhook) {
      console.log("Webhook already exists:", existingWebhook.id);
      console.log("Status:", existingWebhook.is_active ? "active" : "inactive");
      return;
    }

    // Create new webhook subscription
    const createResponse = await fetch(`${FANBASES_API_URL}/webhook-subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": fanbasesApiKey,
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        event_types: [
          "payment.succeeded",
          "payment.failed",
          "payment.refunded",
          "subscription.created",
          "subscription.renewed",
          "subscription.canceled",
          "subscription.expired",
          "product.purchased",
        ],
        is_active: true,
      }),
    });

    const createData = await createResponse.json();

    if (createResponse.ok) {
      console.log("Webhook created successfully!");
      console.log("Response:", JSON.stringify(createData, null, 2));
    } else {
      console.error("Failed to create webhook:");
      console.error("Status:", createResponse.status);
      console.error("Response:", JSON.stringify(createData, null, 2));
    }
  } catch (error) {
    console.error("Error setting up webhook:", error);
  }
}

// Run the setup
setupWebhook();
