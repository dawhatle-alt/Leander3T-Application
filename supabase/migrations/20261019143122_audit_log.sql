-- Audit trail: who signed in (and who failed to), and who changed what.
--
--   access_log  — sign-ins, failed sign-ins, sign-outs, password changes,
--                 invitations. Written by the app server (it alone sees the
--                 IP address and browser), never by the browser.
--   audit_log   — every insert/update/delete on jobs, crew assignments,
--                 material orders, order forms and people, written by
--                 triggers so no save path can skip it.
--   jobs.updated_by — who last changed the job itself, next to updated_at.
--
-- Both logs are append-only: readable by Administration only, and nobody
-- (including the server key) can edit or delete rows through the API.
--
-- Bulk loads (seed scripts, the Airtable import) can skip the change log for
-- their own session with:   set local app.skip_audit = 'on';

-- ---------------------------------------------------------------------------
-- Who is making this change?
--   1. The signed-in person (auth.uid()), for everything done in the app.
--   2. For the few server actions that must use the server key (invitations),
--      the app passes the acting administrator in an x-actor-id header. It is
--      trusted only when the request carries the service-role key.
-- Returns null for anything else (SQL console, Supabase Auth itself), which
-- the screens show as "System".
-- ---------------------------------------------------------------------------
create function private.audit_actor()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id     uuid := auth.uid();
  v_claims json;
  v_header text;
begin
  if v_id is null then
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::json;
    if v_claims ->> 'role' = 'service_role' then
      v_header := nullif(current_setting('request.headers', true), '')::json ->> 'x-actor-id';
      if v_header ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_id := v_header::uuid;
      end if;
    end if;
  end if;

  -- Only real people count; anything else is "System".
  if v_id is not null
     and not exists (select 1 from public.profiles p where p.id = v_id) then
    v_id := null;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Change log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  -- Snapshot of who did it, so the history survives a person being removed.
  actor_id     uuid,
  actor_name   text,
  actor_role   public.app_role,
  action       text not null check (action in ('insert', 'update', 'delete')),
  table_name   text not null,
  record_id    text not null,
  record_label text,
  -- Every row that belongs to a job carries it, so a job's history includes
  -- its orders and assignments, even after they (or the job) are deleted.
  job_id       uuid,
  job_address  text,
  -- update: { column: { "old": ..., "new": ... } } for changed columns only.
  changes      jsonb,
  -- insert / delete: the whole row as it was.
  snapshot     jsonb
);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_job_idx on public.audit_log (job_id, occurred_at desc) where job_id is not null;
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_table_idx on public.audit_log (table_name, occurred_at desc);
alter table public.audit_log enable row level security;

create policy "Administration reads the change log"
  on public.audit_log for select
  to authenticated
  using ((select private.is_admin()));

revoke all on public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sign-in log
-- ---------------------------------------------------------------------------
create table public.access_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event       text not null check (event in (
                'sign_in', 'sign_in_failed', 'sign_out',
                'password_changed', 'password_set', 'invited')),
  -- password | email_link | invite | password_reset
  method      text,
  -- The account involved; null when someone tried an email with no account.
  user_id     uuid,
  email       text,
  -- The administrator who did it, for password_set and invited.
  actor_id    uuid,
  actor_name  text,
  ip          text,
  user_agent  text,
  detail      text
);
create index access_log_occurred_at_idx on public.access_log (occurred_at desc);
create index access_log_user_idx on public.access_log (user_id, occurred_at desc);
create index access_log_event_idx on public.access_log (event, occurred_at desc);
alter table public.access_log enable row level security;

create policy "Administration reads the sign-in log"
  on public.access_log for select
  to authenticated
  using ((select private.is_admin()));

-- Only the app server (service-role key) adds rows; nobody edits or deletes.
revoke all on public.access_log from anon;
revoke insert, update, delete, truncate on public.access_log from authenticated;
revoke update, delete, truncate on public.access_log from service_role;

-- Most recent sign-in per person, for the Activity screen. Runs with the
-- reader's rights, so the access_log policy above still applies.
create view public.last_sign_ins
with (security_invoker = true)
as
select distinct on (user_id)
  user_id, occurred_at, method, ip, user_agent
from public.access_log
where event = 'sign_in' and user_id is not null
order by user_id, occurred_at desc;

revoke all on public.last_sign_ins from anon;

-- ---------------------------------------------------------------------------
-- The trigger that writes the change log
-- ---------------------------------------------------------------------------
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old      jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new      jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row      jsonb := coalesce(v_new, v_old);
  v_changes  jsonb;
  v_actor    uuid;
  v_name     text;
  v_role     public.app_role;
  v_job_id   uuid;
  v_address  text;
  v_record   text;
  v_label    text;
begin
  if current_setting('app.skip_audit', true) = 'on' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_changes
      from jsonb_each(v_new) n
      join jsonb_each(v_old) o on o.key = n.key
     where n.value is distinct from o.value
       and n.key not in ('updated_at', 'updated_by', 'created_at');
    -- A save that changed nothing isn't worth a line.
    if v_changes is null then
      return null;
    end if;
  end if;

  v_actor := private.audit_actor();
  if v_actor is not null then
    select coalesce(p.full_name, p.email), p.role
      into v_name, v_role
      from public.profiles p
     where p.id = v_actor;
  end if;

  -- Which record, which job, and a label a person can read.
  case tg_table_name
    when 'jobs' then
      v_record  := v_row ->> 'id';
      v_job_id  := (v_row ->> 'id')::uuid;
      v_address := v_row ->> 'property_address';
      v_label   := v_address;
    when 'profiles' then
      v_record := v_row ->> 'id';
      v_label  := coalesce(v_row ->> 'full_name', v_row ->> 'email');
    when 'job_assignments' then
      v_record := (v_row ->> 'profile_id') || ':' || (v_row ->> 'kind');
      v_job_id := (v_row ->> 'job_id')::uuid;
      select coalesce(p.full_name, p.email) || ' (' || (v_row ->> 'kind') || ')'
        into v_label
        from public.profiles p
       where p.id = (v_row ->> 'profile_id')::uuid;
    when 'stucco_order_items' then
      v_record := (v_row ->> 'order_id') || ':' || (v_row ->> 'item_code');
      select o.job_id, 'Order #' || o.order_number || ' · ' || coalesce(i.name, v_row ->> 'item_code')
        into v_job_id, v_label
        from public.stucco_material_orders o
        left join public.stucco_items i on i.code = v_row ->> 'item_code'
       where o.id = (v_row ->> 'order_id')::uuid;
    when 'order_forms' then
      v_record := v_row ->> 'id';
      v_job_id := (v_row ->> 'job_id')::uuid;
      v_label  := 'Form #' || coalesce(v_row ->> 'form_number', '?');
    else
      -- Material orders and address blocks.
      v_record := v_row ->> 'id';
      v_job_id := (v_row ->> 'job_id')::uuid;
      if v_row ? 'order_number' then
        v_label := 'Order #' || coalesce(v_row ->> 'order_number', '?');
      end if;
  end case;

  if v_job_id is not null and v_address is null then
    select j.property_address into v_address
      from public.jobs j
     where j.id = v_job_id;
    -- The job itself may be the thing being deleted in this statement.
    v_address := coalesce(v_address, (
      select a.job_address from public.audit_log a
       where a.job_id = v_job_id and a.job_address is not null
       order by a.id desc limit 1));
  end if;

  insert into public.audit_log (
    actor_id, actor_name, actor_role, action, table_name, record_id,
    record_label, job_id, job_address, changes, snapshot)
  values (
    v_actor, v_name, v_role, lower(tg_op), tg_table_name, coalesce(v_record, '?'),
    v_label, v_job_id, v_address, v_changes,
    case when tg_op <> 'UPDATE' then v_row end);

  return null;
end;
$$;

-- Attach it to everything in scope: jobs, crew/supervisor assignments, every
-- material order, address blocks, order forms, and people (roles, access).
do $$
declare
  t text;
begin
  foreach t in array array[
    'jobs', 'job_assignments', 'profiles',
    'address_block_orders', 'sand_orders', 'mortar_orders', 'lintel_orders',
    'arch_lintel_orders', 'rock_orders', 'stucco_material_orders',
    'stucco_order_items', 'paint_orders', 'order_forms'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.audit_row_change()',
      t || '_audit', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- jobs.updated_by — "Last updated 10/19 9:42 AM by Harlee"
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column updated_by uuid references public.profiles (id) on delete set null;
create index jobs_updated_by_idx on public.jobs (updated_by);

-- Existing jobs: best answer we have is whoever created them. Don't let the
-- backfill itself bump every job's updated_at.
alter table public.jobs disable trigger jobs_set_updated_at;
update public.jobs set updated_by = created_by where updated_by is null;
alter table public.jobs enable trigger jobs_set_updated_at;

create function private.stamp_job_updated_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'updated_at' - 'updated_by')
       = (to_jsonb(old) - 'updated_at' - 'updated_by') then
    -- Saved without changing anything (or only updated_by changed because
    -- that person was removed): keep the real time of the last change.
    new.updated_at := old.updated_at;
    return new;
  end if;
  new.updated_by := private.audit_actor();
  return new;
end;
$$;

-- Named to sort after jobs_set_updated_at, so it sees (and can undo) that bump.
create trigger jobs_stamp_updated_by
  before insert or update on public.jobs
  for each row execute function private.stamp_job_updated_by();
