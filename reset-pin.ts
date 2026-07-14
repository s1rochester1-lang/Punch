import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { isValidPin, pinToPassword } from "../src/lib/pin";

// Server-only secrets. SUPABASE_SERVICE_ROLE_KEY must be set in the Vercel
// project's environment variables WITHOUT a VITE_ prefix, so it is never
// bundled into client code. Find it in Supabase under
// Project Settings -> API -> service_role (secret).
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token." });

  const { employeeId, newPin } = req.body ?? {};
  if (!employeeId || !isValidPin(newPin)) {
    return res.status(400).json({ error: "A valid employeeId and 4-digit newPin are required." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Confirm who's calling, then confirm they're a manager, before touching
  // anyone's password. Never trust a role claimed by the client.
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (profileError || callerProfile?.role !== "manager") {
    return res.status(403).json({ error: "Only managers can reset a PIN." });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(employeeId, {
    password: pinToPassword(newPin),
  });

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ ok: true });
}
