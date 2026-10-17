-- M1 · Jobs: one house at one address, with specs per trade.

create type public.job_status as enum ('new', 'in_progress', 'completed');
create type public.lot_swing as enum ('right', 'left', 'other');

create table public.jobs (
  id                       uuid primary key default gen_random_uuid(),
  company                  public.company not null default 'leander_3t',

  -- Address and plan
  house_number             text not null,
  street                   text not null,
  property_address         text generated always as (house_number || ' ' || street) stored,
  subdivision              text,
  area                     text,          -- city / area (legacy free text, cleaned on import)
  area_directions          text,          -- driving directions split out of the legacy Area field
  plan_name                text,
  plan_number              text,
  elevation                text,
  lot_swing                public.lot_swing,
  sqft                     numeric(8, 2),

  -- Builder side
  builder_id               uuid references public.builders (id) on delete restrict,
  construction_manager_id  uuid references public.construction_managers (id) on delete set null,

  -- Status and key dates
  status                   public.job_status not null default 'new',
  completion_percent       numeric(5, 2) not null default 0
                             check (completion_percent between 0 and 100),
  date_received            date,
  targeted_completion_date date,
  supply_delivery_date     date,
  job_completed_date       date,

  -- Brick
  brick_sqft               numeric(8, 2),
  brick_color_id           uuid references public.brick_colors (id) on delete set null,
  brick_mortar_color_id    uuid references public.mortar_colors (id) on delete set null,
  brick_drop_slab_ft       numeric(8, 2),
  brick_detail_ft          numeric(8, 2),
  brick_paver_ft           numeric(8, 2),
  brick_start_date         date,
  brick_end_date           date,
  brick_completion_date    date,
  brick_crew_id            uuid references public.crews (id) on delete set null,
  brick_notes              text,

  -- Stone
  stone_sqft               numeric(8, 2),
  stone_color              text,
  stone_mortar_color_id    uuid references public.mortar_colors (id) on delete set null,
  stone_drop_ft            numeric(8, 2),
  stone_start_date         date,
  stone_end_date           date,
  stone_completion_date    date,
  stone_crew_id            uuid references public.crews (id) on delete set null,
  stone_notes              text,

  -- Stucco
  stucco_sqft              numeric(8, 2),
  stucco_body_paint_color  text,
  stucco_trim_paint_color  text,
  stucco_percent_complete  numeric(5, 2) check (stucco_percent_complete between 0 and 100),
  stucco_start_date        date,
  stucco_end_date          date,
  stucco_completion_date   date,
  stucco_crew_id           uuid references public.crews (id) on delete set null,
  stucco_notes             text,

  -- Fireplace and general notes
  has_fireplace            boolean not null default false,
  fireplace_notes          text,
  additional_notes         text,

  airtable_id              text unique,
  created_by               uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index jobs_builder_id_idx on public.jobs (builder_id);
create index jobs_construction_manager_id_idx on public.jobs (construction_manager_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_subdivision_idx on public.jobs (subdivision);
create index jobs_brick_crew_id_idx on public.jobs (brick_crew_id);
create index jobs_stone_crew_id_idx on public.jobs (stone_crew_id);
create index jobs_stucco_crew_id_idx on public.jobs (stucco_crew_id);
create index jobs_brick_color_id_idx on public.jobs (brick_color_id);
create index jobs_brick_mortar_color_id_idx on public.jobs (brick_mortar_color_id);
create index jobs_stone_mortar_color_id_idx on public.jobs (stone_mortar_color_id);
create index jobs_created_by_idx on public.jobs (created_by);
alter table public.jobs enable row level security;

-- Who is on a job: supervisors (can edit it) and employees (can add photos/notes).
create type public.assignment_kind as enum ('supervisor', 'employee');

create table public.job_assignments (
  job_id     uuid not null references public.jobs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       public.assignment_kind not null,
  created_at timestamptz not null default now(),
  primary key (job_id, profile_id, kind)
);
create index job_assignments_profile_id_idx on public.job_assignments (profile_id);
alter table public.job_assignments enable row level security;

-- ---------------------------------------------------------------------------
-- Job access helpers
-- ---------------------------------------------------------------------------
create function private.can_read_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.current_app_role()
    when 'admin' then true
    when 'supervisor' then true
    when 'employee' then exists (
      select 1 from public.job_assignments a
      where a.job_id = p_job_id and a.profile_id = (select auth.uid()))
    when 'crew_manager' then exists (
      select 1 from public.jobs j
      where j.id = p_job_id
        and (j.brick_crew_id = any (private.my_crew_ids())
          or j.stone_crew_id = any (private.my_crew_ids())
          or j.stucco_crew_id = any (private.my_crew_ids())))
    when 'builder' then exists (
      select 1 from public.jobs j
      where j.id = p_job_id and j.builder_id = private.current_builder_id())
    else false
  end;
$$;

-- Edit the job itself: admins, and supervisors assigned to it.
create function private.can_write_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or (private.current_app_role() = 'supervisor' and exists (
      select 1 from public.job_assignments a
      where a.job_id = p_job_id and a.profile_id = (select auth.uid())
        and a.kind = 'supervisor'));
$$;

-- Create and edit material orders: job editors, plus crew managers on their crew's jobs.
create function private.can_order_for_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_write_job(p_job_id)
    or (private.current_app_role() = 'crew_manager' and private.can_read_job(p_job_id));
$$;

grant execute on function private.can_read_job(uuid) to authenticated;
grant execute on function private.can_write_job(uuid) to authenticated;
grant execute on function private.can_order_for_job(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Jobs policies
-- ---------------------------------------------------------------------------
create policy "Admins and supervisors read all jobs"
  on public.jobs for select to authenticated
  using ((select private.current_app_role()) in ('admin', 'supervisor'));

create policy "Employees read jobs they are assigned to"
  on public.jobs for select to authenticated
  using (
    (select private.current_app_role()) = 'employee'
    and exists (select 1 from public.job_assignments a
                where a.job_id = jobs.id and a.profile_id = (select auth.uid()))
  );

create policy "Crew managers read their crew's jobs"
  on public.jobs for select to authenticated
  using (
    array[brick_crew_id] <@ (select private.my_crew_ids())
    or array[stone_crew_id] <@ (select private.my_crew_ids())
    or array[stucco_crew_id] <@ (select private.my_crew_ids())
  );

create policy "Builders read their own jobs"
  on public.jobs for select to authenticated
  using (builder_id = (select private.current_builder_id()));

create policy "Admins and supervisors create jobs"
  on public.jobs for insert to authenticated
  with check ((select private.current_app_role()) in ('admin', 'supervisor'));

create policy "Admins and assigned supervisors update jobs"
  on public.jobs for update to authenticated
  using ((select private.can_write_job(id)))
  with check ((select private.can_write_job(id)));

create policy "Admins delete jobs"
  on public.jobs for delete to authenticated
  using ((select private.is_admin()));

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function private.set_updated_at();

-- A supervisor who creates a job supervises it.
create function private.assign_creating_supervisor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.current_app_role() = 'supervisor' then
    insert into public.job_assignments (job_id, profile_id, kind)
    values (new.id, (select auth.uid()), 'supervisor')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger jobs_assign_creating_supervisor
  after insert on public.jobs
  for each row execute function private.assign_creating_supervisor();

-- Automation 2: completion reaches 100% → status completed and completed date stamped.
-- (Replaces "Project Completion Status" and "Set Completed Date".)
create function private.jobs_completion_rollup()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completion_percent >= 100 then
    new.status := 'completed';
  end if;
  if new.status = 'completed' and new.job_completed_date is null then
    new.job_completed_date := private.today_central();
  end if;
  return new;
end;
$$;

create trigger jobs_completion_rollup
  before insert or update of completion_percent, status on public.jobs
  for each row execute function private.jobs_completion_rollup();

-- Automation 4: stone dates follow the brick schedule on jobs with stone work,
-- unless someone has set the stone dates themselves.
-- (Replaces "Auto Update Stone Start Date" and "Auto Update Stone End Date".)
create function private.jobs_stone_dates_follow_brick()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(new.stone_sqft, 0) > 0 then
    if new.brick_start_date is distinct from old.brick_start_date
       and new.stone_start_date is not distinct from old.stone_start_date
       and (old.stone_start_date is null or old.stone_start_date = old.brick_start_date) then
      new.stone_start_date := new.brick_start_date;
    end if;
    if new.brick_end_date is distinct from old.brick_end_date
       and new.stone_end_date is not distinct from old.stone_end_date
       and (old.stone_end_date is null or old.stone_end_date = old.brick_end_date) then
      new.stone_end_date := new.brick_end_date;
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_stone_dates_follow_brick
  before update of brick_start_date, brick_end_date on public.jobs
  for each row execute function private.jobs_stone_dates_follow_brick();

-- Job assignments policies
create policy "People who can see a job see who is on it"
  on public.job_assignments for select to authenticated
  using ((select private.is_staff()) and (select private.can_read_job(job_id)));

create policy "Admins manage job assignments"
  on public.job_assignments for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Notes, photos, documents
-- ---------------------------------------------------------------------------
create table public.job_notes (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  author_id  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index job_notes_job_id_idx on public.job_notes (job_id);
create index job_notes_author_id_idx on public.job_notes (author_id);
alter table public.job_notes enable row level security;

create policy "Staff on a job read its notes"
  on public.job_notes for select to authenticated
  using ((select private.is_staff()) and (select private.can_read_job(job_id)));

create policy "Staff on a job add notes"
  on public.job_notes for insert to authenticated
  with check ((select private.is_staff()) and (select private.can_read_job(job_id))
              and author_id = (select auth.uid()));

create policy "Admins and authors delete notes"
  on public.job_notes for delete to authenticated
  using ((select private.is_admin()) or author_id = (select auth.uid()));

create table public.job_photos (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs (id) on delete cascade,
  storage_path text not null unique,   -- object path in the "photos" bucket; never a URL
  caption      text,
  trade        public.trade,
  taken_on     date,
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  airtable_id  text unique,
  created_at   timestamptz not null default now()
);
create index job_photos_job_id_idx on public.job_photos (job_id);
create index job_photos_uploaded_by_idx on public.job_photos (uploaded_by);
alter table public.job_photos enable row level security;

create policy "Anyone who can see a job sees its photos"
  on public.job_photos for select to authenticated
  using ((select private.can_read_job(job_id)));

create policy "Staff on a job add photos"
  on public.job_photos for insert to authenticated
  with check ((select private.is_staff()) and (select private.can_read_job(job_id)));

create policy "Admins and uploaders delete photos"
  on public.job_photos for delete to authenticated
  using ((select private.is_admin()) or uploaded_by = (select auth.uid()));

create type public.document_kind as enum (
  'plans', 'front_elevation', 'color_selection', 'order_form', 'other'
);

create table public.job_documents (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs (id) on delete cascade,
  kind         public.document_kind not null,
  storage_path text not null unique,   -- object path in "plans" or "order-forms"; never a URL
  file_name    text,
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  airtable_id  text unique,
  created_at   timestamptz not null default now()
);
create index job_documents_job_id_idx on public.job_documents (job_id);
create index job_documents_uploaded_by_idx on public.job_documents (uploaded_by);
alter table public.job_documents enable row level security;

create policy "Staff on a job read its documents"
  on public.job_documents for select to authenticated
  using ((select private.is_staff()) and (select private.can_read_job(job_id)));

create policy "Builders read plans and elevations for their jobs"
  on public.job_documents for select to authenticated
  using ((select private.current_app_role()) = 'builder'
         and kind in ('plans', 'front_elevation', 'color_selection')
         and (select private.can_read_job(job_id)));

create policy "Job editors add documents"
  on public.job_documents for insert to authenticated
  with check ((select private.can_write_job(job_id)));

create policy "Admins delete documents"
  on public.job_documents for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Address blocks (stone/brick address marker), one per job
-- ---------------------------------------------------------------------------
create type public.address_block_status as enum ('none', 'ordered', 'delivered');

create table public.address_block_orders (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null unique references public.jobs (id) on delete cascade,
  status         public.address_block_status not null default 'none',
  ordered_date   date,
  delivered_date date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.address_block_orders enable row level security;

create policy "Anyone who can see a job sees its address block"
  on public.address_block_orders for select to authenticated
  using ((select private.can_read_job(job_id)));

create policy "Job editors manage address blocks"
  on public.address_block_orders for all to authenticated
  using ((select private.can_write_job(job_id)))
  with check ((select private.can_write_job(job_id)));

create trigger address_block_orders_set_updated_at
  before update on public.address_block_orders
  for each row execute function private.set_updated_at();

-- Automation 3: stamp the ordered / delivered date when the status is set.
-- (Replaces "Address block Order Date" and "Address block Delivered Date".)
create function private.address_block_stamp_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('ordered', 'delivered') and new.ordered_date is null then
    new.ordered_date := private.today_central();
  end if;
  if new.status = 'delivered' and new.delivered_date is null then
    new.delivered_date := private.today_central();
  end if;
  return new;
end;
$$;

create trigger address_block_stamp_dates
  before insert or update of status on public.address_block_orders
  for each row execute function private.address_block_stamp_dates();
