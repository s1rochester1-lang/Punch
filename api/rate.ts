import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getBearerToken, verifySession } from "./_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = verifySession(getBearerToken(req));
  if (!session) return res.status(401).json({ error: "Not signed in." });

  const admin = getSupabaseAdmin();
  const { data: me } = await admin.from("employees").select("role").eq("id", session.sub).single();
  if (me?.role !== "manager") return res.status(403).json({ error: "Managers only." });

  const { employeeId, hourlyRate } = req.body ?? {};
  const rate = Number(hourlyRate);
  if (!employeeId || Number.isNaN(rate) || rate < 0) {
    return res.status(400).json({ error: "A valid employeeId and hourlyRate are required." });
  }

  const { error } = await admin.from("employees").update({ hourly_rate: rate }).eq("id", employeeId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
