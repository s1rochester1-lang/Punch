-- Run this once in your Supabase project's SQL editor.
-- Dashboard: Project -> SQL Editor -> New query -> paste all of this -> Run.
--
-- This replaces the earlier Supabase-Auth-based schema. The app no longer
-- uses Supabase Auth (or email) at all - PINs are hashed and stored
-- directly here, and a Vercel serverless function checks them and issues
-- its own session token. Every table is accessed only through that
-- service-role backend, never directly from the browser.

-- 0. CLEAN UP THE OLD SCHEMA (safe to run even if these don't exist) -----

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists guard_self_backdating on public.time_entries;
drop trigger if exists set_time_entries_updated_at on public.time_entries;
drop function if exists public.handle_new_user();
drop function if exists public.is_manager(uuid);
drop function if exists public.prevent_self_backdating();
drop table if exists public.time_entries;
drop table if exists public.staff_directory;
drop table if exists public.profiles;

-- 1. EMPLOYEES --------------------------------------------------------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  pin_hash text not null,
  role text not null default 'employee' check (role in ('manager', 'employee')),
  hourly_rate numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- RLS is enabled with no policies defined, which means: default-deny for
-- both the anon and authenticated roles. The only way to read or write
-- this table is through the service-role key, which only ever runs inside
-- our own Vercel serverless functions (never sent to the browser). This is
-- intentionally simpler than per-row RLS policies, since every access
-- decision (who can see whose data, who can edit what) is enforced in
-- that backend code instead of in Postgres policies.
alter table public.employees enable row level security;

-- 2. TIME ENTRIES -------------------------------------------------------

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  clock_in timestamptz not null,
  clock_out timestamptz,
  source text not null default 'self' check (source in ('self', 'manager')),
  notes text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.time_entries enable row level security;

create index time_entries_employee_idx on public.time_entries (employee_id, clock_in desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_time_entries_updated_at
  before update on public.time_entries
  for each row execute procedure public.set_updated_at();

-- 3. FIRST MANAGER ---------------------------------------------------------
-- After your first sign-up in the app (tap "I'm new here"), promote that
-- account to manager by running (replace with your actual name as typed
-- into the app):
--
--   update public.employees set role = 'manager'
--   where full_name = 'Your Name';
--
-- If more than one person shares that name, target the row by id instead:
--   select id, full_name, created_at from public.employees order by created_at desc;
--   update public.employees set role = 'manager' where id = 'paste-the-id-here';
