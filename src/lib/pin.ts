// Supabase Auth still sits underneath the PIN login, which is what keeps
// every row-level-security rule in supabase/schema.sql working unchanged.
// A 4-digit PIN is too short for Supabase's minimum password length, so we
// pad it with a fixed, non-secret suffix before it ever touches the auth
// API. This is NOT a secret - it's bundled into the client - it exists
// purely to satisfy the length check. The PIN itself is what a staff
// member actually needs to know.
//
// Security model: this is convenience-level access control, the same
// trust level as a restaurant POS clock-in pad - appropriate for a small
// crew on their own or a shared work device, not intended to resist a
// determined attacker with API access. See README for details.
const PIN_PAD = "punch-pad";
const LOGIN_DOMAIN = "staffpin.local";

export function pinToPassword(pin: string): string {
  return `${pin}${PIN_PAD}`;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "staff"
  );
}

export function emailForSlug(slug: string): string {
  return `${slug}@${LOGIN_DOMAIN}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
