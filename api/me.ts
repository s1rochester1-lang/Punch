import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getBearerToken, verifySession } from "./_shared/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = verifySession(getBearerToken(req));
  if (!session) return res.status(401).json({ error: "Not signed in." });

  const admin = getSupabaseAdmin();
  const { data: employee, error } = await admin
    .from("employees")
    .select("id, full_name, role, hourly_rate")
    .eq("id", session.sub)
    .single();

  if (error || !employee) return res.status(401).json({ error: "Account not found." });
  return res.status(200).json({ profile: employee });
}
