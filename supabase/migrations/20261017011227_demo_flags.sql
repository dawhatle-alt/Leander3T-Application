-- M2 · Mark demo data so it can be removed in one step before the Airtable import.
-- Only the top-level tables carry the flag; everything hanging off a demo job
-- (orders, notes, assignments, address blocks, stucco line items) is removed
-- with it by the existing ON DELETE CASCADE foreign keys. Demo sign-ins are
-- marked with app_metadata.demo = true on auth.users.

alter table public.builders              add column demo boolean not null default false;
alter table public.construction_managers add column demo boolean not null default false;
alter table public.suppliers             add column demo boolean not null default false;
alter table public.crews                 add column demo boolean not null default false;
alter table public.jobs                  add column demo boolean not null default false;
alter table public.info_requests         add column demo boolean not null default false;

comment on column public.jobs.demo is
  'Demo/seed data (supabase/seed/demo.sql). Removed by supabase/seed/clear-demo.sql before the Airtable import.';
