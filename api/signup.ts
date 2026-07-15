import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, hashPin, signSession } from "./_shared/auth.js";
import { isValidPin } from "./_shared/pin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { fullName, pin } = req.body ?? {};
  const name = typeof fullName === "string" ? fullName.trim() : "";
  if (!name) return res.status(400).json({ error: "A name is required." });
  if (!isValidPin(pin)) return res.status(400).json({ error: "PIN must be 4 digits." });

  const admin = getSupabaseAdmin();
  const { data: employee, error } = await admin
    .from("employees")
    .insert({ full_name: name, pin_hash: hashPin(pin), role: "employee", hourly_rate: 0 })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

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
