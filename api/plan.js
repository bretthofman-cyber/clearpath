import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  if (req.method === "GET") {
    const { data: row, error } = await supabaseAdmin
      .from("plans")
      .select("data, stage")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ row: row ?? null });
  }

  if (req.method === "POST") {
    const { data, stage } = req.body ?? {};
    const { error } = await supabaseAdmin
      .from("plans")
      .upsert({ user_id: userId, data, stage }, { onConflict: "user_id" });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
