import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "./_shared/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("employees")
    .select("id, full_name")
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ employees: data });
}
