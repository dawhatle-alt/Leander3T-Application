-- M9 security test: a builder user can see only their own company's homes,
-- and nothing internal (suppliers, orders, order forms, notes, costs,
-- payroll archive, staff profiles, crews, website requests).
--
-- Runs as the demo builder user "Sam Oehler" (Ashton Woods) by switching to
-- the authenticated role with his JWT claims, exactly as PostgREST does.
-- Everything runs in one transaction and is rolled back. Any failed check
-- raises an exception naming it.
--
--   psql "$DATABASE_URL" -f supabase/tests/portal_isolation.sql
--   (or paste into the Supabase SQL editor)

begin;

select set_config('request.jwt.claims',
  json_build_object('sub', md5('l3t-demo:user:sam')::uuid::text, 'role', 'authenticated')::text,
  true);
set local role authenticated;

do $$
declare
  me        uuid := md5('l3t-demo:user:sam')::uuid;
  my_b      uuid := private.current_builder_id();
  other_job uuid;
  n         bigint;
  t         text;
begin
  if my_b is null then raise exception 'setup: Sam is not a builder user'; end if;

  -- Homes: some visible, all his company's.
  select count(*) into n from public.jobs;
  if n = 0 then raise exception 'jobs: builder sees no homes at all'; end if;
  select count(*) into n from public.jobs where builder_id is distinct from my_b;
  if n <> 0 then raise exception 'jobs: % homes from other builders visible', n; end if;

  -- Internal tables: nothing at all.
  foreach t in array array[
    'suppliers', 'sand_orders', 'mortar_orders', 'lintel_orders',
    'arch_lintel_orders', 'rock_orders', 'stucco_material_orders',
    'paint_orders', 'stucco_order_items', 'order_forms', 'job_notes',
    'job_assignments', 'crews', 'info_requests',
    'payroll_archive_labor_types', 'payroll_archive_pay_requests',
    'payroll_archive_extras'
  ] loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception '%: builder can read % rows', t, n; end if;
  end loop;

  -- People: only himself; other companies' contacts never.
  select count(*) into n from public.profiles where id <> me;
  if n <> 0 then raise exception 'profiles: % other people visible', n; end if;
  select count(*) into n from public.builders where id <> my_b;
  if n <> 0 then raise exception 'builders: % other builders visible', n; end if;
  select count(*) into n from public.construction_managers
    where builder_id is distinct from my_b;
  if n <> 0 then raise exception 'construction_managers: % from other builders', n; end if;

  -- Photos, documents, address blocks, requests: own homes only.
  select count(*) into n from public.job_photos p
    join public.jobs j on j.id = p.job_id where j.builder_id is distinct from my_b;
  if n <> 0 then raise exception 'job_photos: % from other builders', n; end if;
  select count(*) into n from public.job_documents
    where kind not in ('plans', 'front_elevation', 'color_selection');
  if n <> 0 then raise exception 'job_documents: % internal documents visible', n; end if;
  select count(*) into n from public.address_block_orders a
    join public.jobs j on j.id = a.job_id where j.builder_id is distinct from my_b;
  if n <> 0 then raise exception 'address_block_orders: % from other builders', n; end if;
  select count(*) into n from public.job_requests where builder_id <> my_b;
  if n <> 0 then raise exception 'job_requests: % from other builders', n; end if;

  -- Storage: photo and plan files of other builders' homes are unreadable.
  select count(*) into n from storage.objects o
    where o.bucket_id in ('photos', 'plans', 'order-forms')
      and private.object_job_id(o.name) in
          (select id from public.jobs where builder_id <> my_b);
  if n <> 0 then raise exception 'storage: % files of other builders readable', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'order-forms';
  if n <> 0 then raise exception 'storage: % order forms readable', n; end if;

  -- Writes: can't change homes, can't file requests for another company.
  update public.jobs set subdivision = subdivision where true;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'jobs: builder updated % homes', n; end if;

  begin
    insert into public.jobs (house_number, street, builder_id)
      values ('1', 'Test St', my_b);
    raise exception 'jobs: builder created a job';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.job_requests (kind, builder_id, house_number, street)
      values ('new_job', (select id from public.builders b2 where b2.id <> my_b limit 1), '1', 'Test St');
    raise exception 'job_requests: builder filed for another company';
  exception when insufficient_privilege or not_null_violation then null;
  end;

  -- An update request about another builder's home is refused.
  reset role;
  select id into other_job from public.jobs where builder_id <> my_b limit 1;
  set local role authenticated;
  begin
    insert into public.job_requests (kind, builder_id, job_id, message)
      values ('update', my_b, other_job, 'test');
    raise exception 'job_requests: builder asked about another builder''s home';
  exception when insufficient_privilege then null;
  end;

  -- A builder can't approve or answer requests.
  update public.job_requests set status = 'approved' where true;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'job_requests: builder reviewed % requests', n; end if;

  -- Role and company can't be self-assigned.
  begin
    update public.profiles set role = 'admin' where id = me;
    raise exception 'profiles: builder made himself an admin';
  exception when insufficient_privilege then null;
  end;

  raise notice 'portal isolation: all checks passed';
end;
$$;

rollback;
