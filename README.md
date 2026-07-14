# Punch — staff time clock

Mobile-first time tracking for a restaurant. Staff tap their name and enter
a 4-digit PIN to clock in and out; managers see everyone's hours, edit or
backfill shifts, set hourly rates, and reset a forgotten PIN. Built as a
static React app (Vite) with Supabase for auth and data, deployable to
Vercel with one small serverless function for PIN resets — no server to run
or maintain.

## How login works

Under the hood, each staff member still gets a real Supabase Auth account —
that's what keeps the database security rules (below) working. The app just
hides the email/password mechanics behind a name + PIN:

- A tapped name maps to an auto-generated, non-secret login address like
  `jordan@staffpin.local`.
- The 4-digit PIN becomes that account's password (padded to meet
  Supabase's minimum length — see `src/lib/pin.ts`).
- Once signed in, the session persists on that phone, same as any app —
  no one re-enters their PIN daily, only the first time or after signing out.

**Security note:** a 4-digit PIN is convenience-level access control, the
same trust model as a restaurant POS clock-in pad — appropriate for a small
crew on their own or a shared work device. It is not intended to resist a
determined attacker with API access, so treat it like you would any staff
device: normal phone lock screens are the actual first line of defense.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free
   tier is fine for a team under 10 — it covers up to 50,000 monthly active
   users and 500MB of database).
2. In the SQL editor, run everything in `supabase/schema.sql`. This creates
   `profiles`, `staff_directory`, and `time_entries`, a trigger that
   auto-creates the right rows on sign-up, and the row-level-security
   policies that keep staff locked to their own data while managers can see
   everyone's.
3. In **Project Settings → API**, copy the **Project URL**, the **anon
   public** key, and the **service_role** (secret) key.
4. Turn off email confirmation so a PIN sign-up works immediately: under
   **Authentication → Providers → Email**, disable **Confirm email**. (The
   synthetic `@staffpin.local` addresses can't receive real confirmation
   emails anyway.)

## 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in the three values from step 1 — note the service role key is
server-only and must **not** get a `VITE_` prefix:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then install and run locally:

```bash
npm install
npm run dev
```

## 3. Create the first manager account

1. Open the running app, tap **I'm new here**, enter your name, and choose
   a PIN. Every new sign-up starts as regular staff.
2. Back in the Supabase SQL editor, run:

   ```sql
   update public.profiles set role = 'manager'
   where id = (select id from public.staff_directory where full_name = 'Your Name');
   ```

3. Sign out and back in. You'll now see a **My Clock / Team** switcher at
   the bottom of the screen. From the Team tab you can set hourly rates,
   reset PINs, and promote other staff to manager the same way if needed.

Going forward, staff just tap **I'm new here** themselves on their own
phone; you set their rate from the Team tab and they're ready to clock in.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo. Framework preset
   auto-detects as Vite; the `api/` folder is picked up automatically as a
   serverless function.
3. Add all three environment variables from step 2 under Project Settings →
   Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` only needs to be
   available at runtime (not build time) — leaving it as a standard env var
   with no `VITE_` prefix is what keeps it off the client bundle.
4. Deploy. `vercel.json` is already set up so client-side routing works on
   refresh.

## How it works

- **Staff** tap their name, enter their PIN, and land on a big clock
  in/out button with a live shift timer, their own history, and a weekly
  pay estimate. They can't edit past shifts.
- **Managers** see a roster of everyone's hours this week, and can tap into
  any employee to add, edit, or delete shifts, change their hourly rate, or
  reset a forgotten PIN.
- All access rules are enforced at the database level (Supabase row-level
  security), not just in the UI — a staff login genuinely cannot read or
  edit anyone else's data, and can't backdate their own clock-in time.
  Only the PIN-reset endpoint uses the powerful service-role key, and even
  that checks server-side that the caller is a manager before doing
  anything.
- Pay shown in the app is an estimate (hours × hourly rate) for the current
  Monday–Sunday week; it's not a payroll system.
