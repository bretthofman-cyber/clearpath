import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let clerkUserId;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    clerkUserId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { event_name, feature = null, context = {} } = req.body ?? {};
  if (!event_name || typeof event_name !== "string") {
    return res.status(400).json({ error: "event_name required" });
  }

  // Strip keys whose values look like financial amounts to enforce privacy rule
  const safeContext = Object.fromEntries(
    Object.entries(context).filter(([, v]) => typeof v !== "number" || v <= 100)
  );

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error: insertErr } = await supabaseAdmin.from("events").insert({
    user_id:    clerkUserId,
    event_name: event_name.slice(0, 80),
    feature:    feature ? String(feature).slice(0, 80) : null,
    context:    safeContext,
  });

  if (insertErr) {
    console.error("[track]", insertErr.message);
    return res.status(500).json({ error: "Failed to record event" });
  }

  return res.status(200).json({ ok: true });
}
