import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_shared/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { fullName } = req.body ?? {};
  const name = typeof fullName === "string" ? fullName.trim() : "";
  if (!name) return res.status(400).json({ error: "A name is required." });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("employees")
    .select("id, full_name")
    .eq("role", "manager")
    .ilike("full_name", name)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "No manager account found with that name." });
  }

  return res.status(200).json({ id: data.id, full_name: data.full_name });
}
