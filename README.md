# Punch — staff time clock

Mobile-first time tracking for a restaurant. Staff tap their name and enter
a 4-digit PIN to clock in and out; managers see everyone's hours, edit or
backfill shifts, set hourly rates, and reset a forgotten PIN.

## How login works (read this first)

**This app does not use Supabase Auth, and never sends or checks any
email, anywhere.** An earlier version tried to reuse Supabase's
email/password auth system as a shortcut, which meant it inherited
Supabase's aggressive anti-spam restrictions on its shared email sender —
even though this app never had any real emails to send. That caused a lot
of pain, so the login was rebuilt from scratch to avoid Supabase's auth
system entirely:

- Each employee's PIN is hashed (Node's built-in `scrypt`, salted) and
  stored directly in our own `employees` table.
- A small set of Vercel serverless functions (`/api/*`) check a tapped
  name + PIN against that table and, on a match, hand back a session token
  we sign and verify ourselves (plain HMAC, no third-party auth library).
- That token is stored in the browser and sent as a header on every
  request; there's nothing for any mailer, anywhere, to ever touch.
- Supabase is still used, but purely as a database — accessed only from
  these serverless functions using the service-role key, never directly
  from the browser.

**Security note:** a 4-digit PIN is convenience-level access control, the
same trust model as a restaurant POS clock-in pad — appropriate for a
small crew on their own or a shared work device, not intended to resist a
determined attacker with API access.

## 1. Set up the Supabase database

1. Go to [supabase.com](https://supabase.com) and create a project (or
   reuse your existing one — this will replace its schema).
2. In the SQL editor, run everything in `supabase/schema.sql`. This drops
   any old auth-based tables from an earlier version of this app (safe to
   run even on a brand-new project) and creates `employees` and
   `time_entries`.
3. In **Project Settings → API Keys**, copy the **Project URL** and the
   **Secret key** (`sb_secret_...`, formerly called "service_role"). You
   won't need the anon/publishable key at all — the browser never talks to
   Supabase directly anymore.
4. Nothing else needs configuring in Supabase. You can ignore the
   Authentication section entirely — this app doesn't use it.

## 2. Set environment variables in Vercel

Under your Vercel project's **Settings → Environment Variables**, you need
exactly three:

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | your Supabase Project URL | read server-side only, despite the `VITE_` name |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase Secret key | server-only, no `VITE_` prefix |
| `SESSION_SECRET` | a long random string | signs/verifies our own login sessions |

For `SESSION_SECRET`, any long random value works — for example, generate
one by running `openssl rand -hex 32` in a terminal, or use any password
generator to make a 40+ character random string. Treat it like a
password: if it ever changes, everyone gets logged out and has to sign
back in with their existing PIN (their account and hours aren't affected).

You can remove `VITE_SUPABASE_ANON_KEY` if it's still set from an earlier
version — it's no longer used anywhere.

After adding/updating these, redeploy (**Deployments → ⋯ → Redeploy**) so
the new values take effect.

## 3. Create the first manager account

1. Open the deployed app, tap **I'm new here**, enter your name, and
   choose a PIN.
2. Back in the Supabase SQL editor, run:

   ```sql
   update public.employees set role = 'manager'
   where full_name = 'Your Name';
   ```

3. Sign out and back in on the app (tap your name, enter your PIN again).
   You'll now see a **My Clock / Team** switcher at the bottom of the
   screen. From the Team tab you can set hourly rates, reset PINs, and
   promote other staff to manager the same way if needed.

Going forward, staff just tap **I'm new here** themselves; you set their
rate from the Team tab and they're ready to clock in.

## How it works

- **Staff** tap their name, enter their PIN, and land on a big clock
  in/out button with a live shift timer, their own history, and a weekly
  pay estimate. Clocking out for lunch and back in later just creates a
  second shift entry the same day — totals automatically exclude the gap.
- **Managers** see a roster of everyone's hours this week, and can tap into
  any employee to add, edit, or delete shifts, change their hourly rate,
  or reset a forgotten PIN.
- Every `/api` endpoint checks the caller's session token itself and
  enforces who's allowed to do what in code (e.g. only managers can see
  other people's hours or edit history) — there's no reliance on
  Postgres row-level security for this, since the database is never
  reachable from the browser in the first place.
- Pay shown in the app is an estimate (hours × hourly rate) for the current
  Monday–Sunday week; it's not a payroll system.
