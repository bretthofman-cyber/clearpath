import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify the caller's Supabase JWT so we never trust client-supplied user IDs
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabaseUser = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { planType, successUrl, cancelUrl } = req.body ?? {};
  const priceMap = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual:  process.env.STRIPE_PRICE_ANNUAL,
  };
  const priceId = priceMap[planType];
  if (!priceId) return res.status(400).json({ error: "Invalid plan type" });

  // Look up existing Stripe customer ID (if user has subscribed before)
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sessionParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${process.env.APP_URL}?checkout=success`,
    cancel_url:  cancelUrl  ?? `${process.env.APP_URL}?checkout=cancelled`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
  };

  if (sub?.stripe_customer_id) {
    sessionParams.customer = sub.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[stripe-checkout]", err.message);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
