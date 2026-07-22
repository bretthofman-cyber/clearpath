import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRIAL_DAYS = 14;

export default async function handler(req, res) {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let userId;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET — fetch subscription status
  if (req.method === "GET") {
    const { data: row, error } = await supabaseAdmin
      .from("subscriptions")
      .select("status, trial_ends_at, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ row: row ?? null });
  }

  // POST — activate trial (only allowed when status is free / no row)
  if (req.method === "POST") {
    const { fromFeature } = req.body ?? {};

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && existing.status !== "free") {
      return res.status(409).json({ error: "Trial already used" });
    }

    const start    = new Date();
    const trialEnd = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { data: row, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id:                    userId,
        status:                     "trialing",
        trial_started_at:           start.toISOString(),
        trial_ends_at:              trialEnd.toISOString(),
        trial_started_from_feature: fromFeature ?? null,
      })
      .select("status, trial_ends_at, stripe_customer_id")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ row });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
