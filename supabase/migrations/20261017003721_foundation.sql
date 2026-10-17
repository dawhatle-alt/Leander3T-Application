-- M1 · Foundation: enums, shared helpers, people, partners, crews, lookups.
-- Every table enables row-level security in the migration that creates it.

-- ---------------------------------------------------------------------------
-- Private schema for access helpers. Not exposed through the Data API, so these
-- security-definer functions can be used by policies but not called as RPCs.
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'admin',          -- Administration: everything
  'supervisor',     -- reads all jobs; writes jobs they supervise
  'employee',       -- reads assigned jobs; adds photos and notes
  'crew_manager',   -- reads their crew's jobs; orders supplies for them
  'builder'         -- portal: reads only their builder's jobs
);

create type public.trade as enum ('brick', 'stone', 'stucco');

create type public.company as enum ('leander_3t', '3t_construction_solutions');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Today's date in the business's time zone (Leander, TX).
create function private.today_central()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Chicago')::date;
$$;

-- ---------------------------------------------------------------------------
-- Builders and their construction managers (portal users)
-- ---------------------------------------------------------------------------
create table public.builders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  contact_name  text,
  contact_phone text,
  contact_email text,
  active        boolean not null default true,
  notes         text,
  airtable_id   text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.builders enable row level security;

create table public.construction_managers (
  id          uuid primary key default gen_random_uuid(),
  builder_id  uuid references public.builders (id) on delete set null,
  name        text not null,
  phone       text,
  email       text,
  airtable_id text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index construction_managers_builder_id_idx on public.construction_managers (builder_id);
alter table public.construction_managers enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user. Role is assigned by an admin, never self-chosen.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  full_name               text,
  email                   text,
  phone                   text,
  role                    public.app_role not null default 'employee',
  builder_id              uuid references public.builders (id) on delete set null,
  construction_manager_id uuid references public.construction_managers (id) on delete set null,
  active                  boolean not null default true,
  airtable_id             text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint builder_role_needs_builder
    check (role <> 'builder' or builder_id is not null)
);
create index profiles_builder_id_idx on public.profiles (builder_id);
create index profiles_construction_manager_id_idx on public.profiles (construction_manager_id);
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Access helpers used by every policy. security definer + empty search_path so
-- they read profiles without recursing through profiles' own policies.
-- ---------------------------------------------------------------------------
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.active;
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

-- The internal office/field team (everyone except crew managers and builders).
create function private.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('admin', 'supervisor', 'employee'), false);
$$;

-- Anyone who works for Leander 3T, crew managers included.
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('admin', 'supervisor', 'employee', 'crew_manager'), false);
$$;

create function private.current_builder_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.builder_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'builder';
$$;

grant execute on all functions in schema private to authenticated;

-- Profiles policies
create policy "Team reads all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_team()));

create policy "Crew managers read Leander 3T staff profiles"
  on public.profiles for select to authenticated
  using ((select private.current_app_role()) = 'crew_manager' and role <> 'builder');

create policy "Everyone reads their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Admins manage profiles"
  on public.profiles for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile for every new auth user. Role and builder come only from
-- app_metadata, which only the server (service role) can set during invite.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, builder_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'employee'),
    nullif(new.raw_app_meta_data ->> 'builder_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Builders policies
create policy "Staff read builders"
  on public.builders for select to authenticated
  using ((select private.is_staff()));

create policy "Builders read their own company"
  on public.builders for select to authenticated
  using (id = (select private.current_builder_id()));

create policy "Admins manage builders"
  on public.builders for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger builders_set_updated_at
  before update on public.builders
  for each row execute function private.set_updated_at();

-- Construction managers policies (crew managers excluded: builder contact details)
create policy "Team reads construction managers"
  on public.construction_managers for select to authenticated
  using ((select private.is_team()));

create policy "Builders read their own construction managers"
  on public.construction_managers for select to authenticated
  using (builder_id = (select private.current_builder_id()));

create policy "Admins manage construction managers"
  on public.construction_managers for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger construction_managers_set_updated_at
  before update on public.construction_managers
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
create type public.order_type as enum (
  'sand', 'mortar', 'lintel', 'arch_lintel', 'rock', 'stucco_material', 'paint'
);

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  order_types public.order_type[] not null default '{}',
  email       text,
  phone       text,
  active      boolean not null default true,
  airtable_id text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.suppliers enable row level security;

create policy "Staff read suppliers"
  on public.suppliers for select to authenticated
  using ((select private.is_staff()));

create policy "Admins manage suppliers"
  on public.suppliers for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Crews (replace the legacy free-text crew select fields)
-- ---------------------------------------------------------------------------
create table public.crews (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  trade           public.trade not null,
  crew_manager_id uuid references public.profiles (id) on delete set null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (name, trade)
);
create index crews_crew_manager_id_idx on public.crews (crew_manager_id);
alter table public.crews enable row level security;

create policy "Staff read crews"
  on public.crews for select to authenticated
  using ((select private.is_staff()));

create policy "Admins manage crews"
  on public.crews for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger crews_set_updated_at
  before update on public.crews
  for each row execute function private.set_updated_at();

-- Crews the signed-in crew manager leads.
create function private.my_crew_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(c.id), '{}')
  from public.crews c
  where c.crew_manager_id = (select auth.uid())
    and c.active
    and private.current_app_role() = 'crew_manager';
$$;
grant execute on function private.my_crew_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Lookup tables. One clean value per choice; legacy typos ("whtie", "whiote")
-- are mapped onto these during the Airtable import.
-- ---------------------------------------------------------------------------
create table public.mortar_colors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  active     boolean not null default true
);
alter table public.mortar_colors enable row level security;

create table public.brick_colors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  active     boolean not null default true
);
alter table public.brick_colors enable row level security;

create policy "Signed-in users read mortar colors"
  on public.mortar_colors for select to authenticated using (true);
create policy "Admins manage mortar colors"
  on public.mortar_colors for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Signed-in users read brick colors"
  on public.brick_colors for select to authenticated using (true);
create policy "Admins manage brick colors"
  on public.brick_colors for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

insert into public.mortar_colors (name, sort_order) values
  ('Type S — Gray', 10),
  ('White', 20),
  ('Spectrum White', 30),
  ('White (tooled)', 40),
  ('Wheat', 50),
  ('TX Tan', 60),
  ('Buff', 70);
