import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyPin, signSession } from "./_shared/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { employeeId, pin } = req.body ?? {};
  if (!employeeId || typeof pin !== "string") {
    return res.status(400).json({ error: "employeeId and pin are required." });
  }

  const admin = getSupabaseAdmin();
  const { data: employee, error } = await admin
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (error || !employee || !verifyPin(pin, employee.pin_hash)) {
    return res.status(401).json({ error: "That PIN didn't match." });
  }

  const token = signSession({ sub: employee.id, role: employee.role });
  return res.status(200).json({
    token,
    profile: {
      id: employee.id,
      full_name: employee.full_name,
      role: employee.role,
      hourly_rate: employee.hourly_rate,
    },
  });
}
