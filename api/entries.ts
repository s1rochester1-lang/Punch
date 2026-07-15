import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getBearerToken, verifySession } from "./_shared/auth.js";

async function isManager(admin: ReturnType<typeof getSupabaseAdmin>, employeeId: string) {
  const { data } = await admin.from("employees").select("role").eq("id", employeeId).single();
  return data?.role === "manager";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = verifySession(getBearerToken(req));
  if (!session) return res.status(401).json({ error: "Not signed in." });
  const admin = getSupabaseAdmin();

  if (req.method === "GET") {
    const targetId = (req.query.employeeId as string) || session.sub;
    if (targetId !== session.sub && !(await isManager(admin, session.sub))) {
      return res.status(403).json({ error: "Not allowed." });
    }
    const { data, error } = await admin
      .from("time_entries")
      .select("*")
      .eq("employee_id", targetId)
      .order("clock_in", { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ entries: data });
  }

  if (req.method === "POST") {
    if (!(await isManager(admin, session.sub))) return res.status(403).json({ error: "Managers only." });
    const { employeeId, clockIn, clockOut, notes } = req.body ?? {};
    if (!employeeId || !clockIn) return res.status(400).json({ error: "employeeId and clockIn are required." });
    const { error } = await admin.from("time_entries").insert({
      employee_id: employeeId,
      clock_in: clockIn,
      clock_out: clockOut ?? null,
      notes: notes ?? null,
      source: "manager",
      created_by: session.sub,
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "PATCH") {
    if (!(await isManager(admin, session.sub))) return res.status(403).json({ error: "Managers only." });
    const { id, clockIn, clockOut, notes } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const { error } = await admin
      .from("time_entries")
      .update({ clock_in: clockIn, clock_out: clockOut ?? null, notes: notes ?? null })
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!(await isManager(admin, session.sub))) return res.status(403).json({ error: "Managers only." });
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const { error } = await admin.from("time_entries").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
