import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { handleWebhookEvent } from "../src/stripeWebhookHandlers.js";

// Disable Vercel's automatic body parsing — Stripe signature verification
// requires the raw request body bytes, not a parsed object.
export const config = { api: { bodyParser: false } };

function bufferBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(typeof c === "string" ? Buffer.from(c) : c));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await bufferBody(req);
  const sig     = req.headers["stripe-signature"];

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const result = await handleWebhookEvent(event, supabase);
  if (!result.ok) {
    console.warn("[stripe-webhook] unhandled event:", event.type, result.reason);
  }

  // Always return 200 to Stripe — errors are logged, not retried unless we 5xx
  return res.status(200).json({ received: true });
}
