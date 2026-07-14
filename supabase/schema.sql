-- Run this once in your Supabase project's SQL editor.
-- Dashboard: Project -> SQL Editor -> New query -> paste all of this -> Run.

-- 1. PROFILES -----------------------------------------------------------
-- One row per auth.users account. Created automatically on sign-up.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('manager', 'employee')),
  hourly_rate numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 1b. STAFF DIRECTORY -----------------------------------------------------
-- A public, name-only lookup so the PIN login screen can show "tap your
-- name" before anyone is authenticated. Deliberately holds nothing
-- sensitive (no rate, no role, no PIN) - just enough to map a tapped name
-- to the synthetic login email the client signs in with.

create table if not exists public.staff_directory (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  login_slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.staff_directory enable row level security;

-- Readable by anyone, including signed-out visitors - that's the point.
-- Never grant insert/update/delete to anon/authenticated; rows are only
-- ever written by the security-definer trigger below.
create policy "staff_directory: public read"
  on public.staff_directory for select
  using (true);

-- Auto-create a profile + directory row whenever someone signs up.
-- The client passes full_name and login_slug in the sign-up metadata
-- (see src/lib/pin.ts on the frontend).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, hourly_rate)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'employee',
    0
  );

  insert into public.staff_directory (id, full_name, login_slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'login_slug', new.id::text)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used by policies below, avoids recursive RLS checks on profiles.
create or replace function public.is_manager(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'manager'
  );
$$;

-- Everyone can read their own profile; managers can read every profile.
create policy "profiles: self or manager can read"
  on public.profiles for select
  using (id = auth.uid() or public.is_manager(auth.uid()));

-- Only managers can change role or hourly_rate; the trigger above (which
-- runs as security definer) handles initial creation.
create policy "profiles: manager can update anyone"
  on public.profiles for update
  using (public.is_manager(auth.uid()));

create policy "profiles: self can update own name"
  on public.profiles for update
  using (id = auth.uid());

-- 2. TIME ENTRIES ---------------------------------------------------------

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  clock_in timestamptz not null,
  clock_out timestamptz,
  source text not null default 'self' check (source in ('self', 'manager')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.time_entries enable row level security;

create index if not exists time_entries_employee_idx on public.time_entries (employee_id, clock_in desc);

-- Employees can see their own entries; managers can see everyone's.
create policy "time_entries: self or manager can read"
  on public.time_entries for select
  using (employee_id = auth.uid() or public.is_manager(auth.uid()));

-- Employees can only create their own self-clock-ins.
create policy "time_entries: self can clock in"
  on public.time_entries for insert
  with check (employee_id = auth.uid() and source = 'self');

-- Managers can create entries for anyone (manual entry).
create policy "time_entries: manager can insert for anyone"
  on public.time_entries for insert
  with check (public.is_manager(auth.uid()));

-- Employees can only touch their own *currently open* shift (i.e. clocking
-- out). Past, already-closed shifts are read-only to them.
create policy "time_entries: self can clock out own open entry"
  on public.time_entries for update
  using (employee_id = auth.uid() and clock_out is null)
  with check (employee_id = auth.uid());

-- Belt-and-suspenders: even on their open entry, staff can only ever set
-- clock_out - they cannot backdate clock_in or reassign the entry. Managers
-- are exempt so they can freely correct any field.
create or replace function public.prevent_self_backdating()
returns trigger language plpgsql as $$
begin
  if not public.is_manager(auth.uid()) then
    if new.clock_in <> old.clock_in
       or new.employee_id <> old.employee_id
       or new.source <> old.source then
      raise exception 'Staff may only set clock_out on their own open shift.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_self_backdating on public.time_entries;
create trigger guard_self_backdating
  before update on public.time_entries
  for each row execute procedure public.prevent_self_backdating();

-- Managers can edit or delete any entry.
create policy "time_entries: manager can update anyone"
  on public.time_entries for update
  using (public.is_manager(auth.uid()));

create policy "time_entries: manager can delete anyone"
  on public.time_entries for delete
  using (public.is_manager(auth.uid()));

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_time_entries_updated_at on public.time_entries;
create trigger set_time_entries_updated_at
  before update on public.time_entries
  for each row execute procedure public.set_updated_at();

-- 3. FIRST MANAGER ---------------------------------------------------------
-- After your first sign-up in the app, promote that account to manager by
-- running (replace the email):
--
--   update public.profiles set role = 'manager'
--   where id = (select id from auth.users where email = 'you@restaurant.com');
