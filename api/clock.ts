import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getBearerToken, verifySession } from "./_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = verifySession(getBearerToken(req));
  if (!session) return res.status(401).json({ error: "Not signed in." });

  const { action } = req.body ?? {};
  const admin = getSupabaseAdmin();

  if (action === "in") {
    const { data: open } = await admin
      .from("time_entries")
      .select("id")
      .eq("employee_id", session.sub)
      .is("clock_out", null)
      .maybeSingle();
    if (open) return res.status(400).json({ error: "Already clocked in." });

    const { error } = await admin.from("time_entries").insert({
      employee_id: session.sub,
      clock_in: new Date().toISOString(),
      source: "self",
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (action === "out") {
    const { data: open } = await admin
      .from("time_entries")
      .select("id")
      .eq("employee_id", session.sub)
      .is("clock_out", null)
      .maybeSingle();
    if (!open) return res.status(400).json({ error: "Not currently clocked in." });

    const { error } = await admin
      .from("time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", open.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "action must be 'in' or 'out'." });
}
