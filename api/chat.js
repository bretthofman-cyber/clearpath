import { verifyToken } from "@clerk/backend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // AI features are intentionally disabled (AFSL compliance).
  return res.status(503).json({ error: "AI features are not available" });
}
