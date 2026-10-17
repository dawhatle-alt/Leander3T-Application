-- M1 · Website information requests and the read-only payroll archive.

-- ---------------------------------------------------------------------------
-- Info requests from the public site. The site writes these through a server
-- action using the service role (with spam protection), so there is no
-- anonymous insert policy here.
-- ---------------------------------------------------------------------------
create type public.request_status as enum ('todo', 'in_progress', 'done');

create table public.info_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  company_name text,
  company_size text,
  phone        text,
  notes        text,
  status       public.request_status not null default 'todo',
  assignee_id  uuid references public.profiles (id) on delete set null,
  airtable_id  text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index info_requests_status_idx on public.info_requests (status);
create index info_requests_assignee_id_idx on public.info_requests (assignee_id);
alter table public.info_requests enable row level security;

create policy "Admins manage info requests"
  on public.info_requests for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create trigger info_requests_set_updated_at
  before update on public.info_requests
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payroll archive: imported once from Airtable, read-only, admins only.
-- No payroll screens and no payroll math in v1. The original record is kept
-- whole in "raw" so a later pay module loses nothing.
-- ---------------------------------------------------------------------------
create table public.payroll_archive_labor_types (
  id           uuid primary key default gen_random_uuid(),
  airtable_id  text not null unique,
  labor_type   text not null,
  price_per_ft numeric(8, 2),
  status       text,
  raw          jsonb not null default '{}'
);
alter table public.payroll_archive_labor_types enable row level security;

create table public.payroll_archive_pay_requests (
  id                     uuid primary key default gen_random_uuid(),
  airtable_id            text not null unique,
  transaction_number     bigint,
  job_id                 uuid references public.jobs (id) on delete set null,
  labor_type             text,
  status                 text,
  percentage_completed   numeric(5, 2),
  previous_percentage    numeric(5, 2),
  balance                numeric(10, 2),
  last_pay_request_date  date,
  completed_100_date     date,
  submitted_by_email     text,
  crew_member_name       text,
  notes                  text,
  raw                    jsonb not null default '{}'
);
create index payroll_archive_pay_requests_job_id_idx on public.payroll_archive_pay_requests (job_id);
alter table public.payroll_archive_pay_requests enable row level security;

create table public.payroll_archive_extras (
  id             uuid primary key default gen_random_uuid(),
  airtable_id    text not null unique,
  pay_request_id uuid references public.payroll_archive_pay_requests (id) on delete set null,
  item_number    bigint,
  item           text,
  notes          text,
  status         text,
  raw            jsonb not null default '{}'
);
create index payroll_archive_extras_pay_request_id_idx on public.payroll_archive_extras (pay_request_id);
alter table public.payroll_archive_extras enable row level security;

-- Read-only: select for admins, and no insert/update/delete policies at all.
create policy "Admins read the payroll archive"
  on public.payroll_archive_labor_types for select to authenticated
  using ((select private.is_admin()));
create policy "Admins read the payroll archive"
  on public.payroll_archive_pay_requests for select to authenticated
  using ((select private.is_admin()));
create policy "Admins read the payroll archive"
  on public.payroll_archive_extras for select to authenticated
  using ((select private.is_admin()));
