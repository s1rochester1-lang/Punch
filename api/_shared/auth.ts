import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// This project deliberately never touches Supabase's Auth/email system.
// PINs are hashed and stored directly in our own `employees` table, and
// sessions are small HMAC-signed tokens we issue and verify ourselves.
// Every serverless function uses the service-role key, which bypasses RLS
// entirely - authorization is enforced here, in code, not in Postgres.

const SESSION_SECRET = process.env.SESSION_SECRET as string;
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// --- PIN hashing (scrypt, built into Node - no extra dependency) ---

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(pin, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- Session tokens (hand-rolled HMAC, no extra dependency) ---

interface SessionPayload {
  sub: string; // employee id
  role: "employee" | "manager";
  exp: number; // unix seconds
}

export function signSession(payload: { sub: string; role: "employee" | "manager" }): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90; // 90 days
  const body: SessionPayload = { ...payload, exp };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const h = req.headers.authorization ?? req.headers.Authorization;
  const header = Array.isArray(h) ? h[0] : h;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}
