import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getBearerToken, verifySession } from "./_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = verifySession(getBearerToken(req));
  if (!session) return res.status(401).json({ error: "Not signed in." });

  const admin = getSupabaseAdmin();
  const { data: me } = await admin.from("employees").select("role").eq("id", session.sub).single();
  if (me?.role !== "manager") return res.status(403).json({ error: "Managers only." });

  const { data: employees, error: empErr } = await admin
    .from("employees")
    .select("id, full_name, role, hourly_rate")
    .order("full_name", { ascending: true });
  if (empErr) return res.status(500).json({ error: empErr.message });

  const { data: entries, error: entErr } = await admin
    .from("time_entries")
    .select("*")
    .order("clock_in", { ascending: false })
    .limit(2000);
  if (entErr) return res.status(500).json({ error: entErr.message });

  return res.status(200).json({ employees, entries });
}
