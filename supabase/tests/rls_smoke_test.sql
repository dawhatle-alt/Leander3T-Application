-- Role-access smoke test for M1.
--
-- Creates throwaway users, builders, crews, jobs and orders; checks what each
-- role can see and change; then ALWAYS raises an exception so the whole test
-- rolls back and leaves no data behind. The exception message is the report:
-- "RLS SMOKE TEST: 30/30 passed (rolled back)", or the list of failures.
--
-- Run as the postgres role, e.g. in the Supabase SQL editor or with psql.

do $test$
declare
  u_admin   uuid := gen_random_uuid();
  u_sup     uuid := gen_random_uuid();   -- supervisor on job 1
  u_sup2    uuid := gen_random_uuid();   -- supervisor on nothing
  u_emp     uuid := gen_random_uuid();   -- employee assigned to job 2
  u_crew    uuid := gen_random_uuid();   -- crew manager of the brick crew on job 1
  u_bldr    uuid := gen_random_uuid();   -- portal user for builder A
  b_a uuid; b_b uuid; cm_a uuid; crew_x uuid; sup_id uuid;
  job1 uuid; job2 uuid;
  n int; ok boolean; d date;
  passed int := 0; total int := 0; failures text := '';
begin
  -- ---------- fixtures (as postgres) ----------
  insert into public.builders (name) values ('TEST Builder A') returning id into b_a;
  insert into public.builders (name) values ('TEST Builder B') returning id into b_b;
  insert into public.construction_managers (builder_id, name, email) values (b_a, 'TEST CM', 'cm@example.test') returning id into cm_a;
  insert into public.suppliers (name) values ('TEST Supplier') returning id into sup_id;

  insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
    (u_admin, 'authenticated', 'authenticated', 'admin@example.test', '{"role":"admin"}', '{}'),
    (u_sup,   'authenticated', 'authenticated', 'sup@example.test',   '{"role":"supervisor"}', '{}'),
    (u_sup2,  'authenticated', 'authenticated', 'sup2@example.test',  '{"role":"supervisor"}', '{}'),
    (u_emp,   'authenticated', 'authenticated', 'emp@example.test',   '{"role":"employee"}', '{}'),
    (u_crew,  'authenticated', 'authenticated', 'crew@example.test',  '{"role":"crew_manager"}', '{"full_name":"TEST Crew Manager"}'),
    (u_bldr,  'authenticated', 'authenticated', 'bldr@example.test',
       jsonb_build_object('role', 'builder', 'builder_id', b_a), '{}');

  insert into public.crews (name, trade, crew_manager_id) values ('TEST Crew 2', 'brick', u_crew) returning id into crew_x;

  insert into public.jobs (house_number, street, builder_id, construction_manager_id, brick_crew_id, stone_sqft, brick_start_date)
    values ('8309', 'Test Grenadier Dr', b_a, cm_a, crew_x, 391, date '2026-07-08') returning id into job1;
  insert into public.jobs (house_number, street, builder_id)
    values ('105', 'Test Adlai Ave', b_b) returning id into job2;

  insert into public.job_assignments (job_id, profile_id, kind) values
    (job1, u_sup, 'supervisor'), (job2, u_emp, 'employee');

  insert into public.sand_orders (job_id, supplier_id, yards) values (job1, sup_id, 14), (job2, sup_id, 9);
  insert into public.payroll_archive_labor_types (airtable_id, labor_type) values ('recTEST', 'Brick');

  -- ---------- 1. new-user trigger ----------
  total := total + 1;
  select count(*) into n from public.profiles
   where (id = u_crew and role = 'crew_manager' and full_name = 'TEST Crew Manager')
      or (id = u_bldr and role = 'builder' and builder_id = b_a);
  if n = 2 then passed := passed + 1; else failures := failures || E'\n- profiles not created with role from app_metadata'; end if;

  -- ---------- 2. triggers ----------
  total := total + 1;
  update public.sand_orders set ordered = true where job_id = job1;
  select ordered_date into d from public.sand_orders where job_id = job1;
  if d = (now() at time zone 'America/Chicago')::date then passed := passed + 1;
  else failures := failures || E'\n- ordered_date not stamped'; end if;

  total := total + 1;
  update public.jobs set brick_start_date = date '2026-07-10' where id = job1;
  select stone_start_date into d from public.jobs where id = job1;
  if d = date '2026-07-10' then passed := passed + 1;
  else failures := failures || E'\n- stone start date did not follow brick'; end if;

  total := total + 1;
  update public.jobs set completion_percent = 100 where id = job2;
  select count(*) into n from public.jobs where id = job2 and status = 'completed' and job_completed_date is not null;
  if n = 1 then passed := passed + 1; else failures := failures || E'\n- completion 100 did not complete the job'; end if;
  update public.jobs set completion_percent = 0, status = 'new', job_completed_date = null where id = job2;

  -- helper: act as a user
  -- (set_config is transaction-local; "reset role" returns to postgres)

  -- ---------- 3. admin ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; select count(*) into n from public.jobs where street like 'Test %';
  if n = 2 then passed := passed + 1; else failures := failures || format(E'\n- admin sees %s jobs, expected 2', n); end if;
  total := total + 1; select count(*) into n from public.payroll_archive_labor_types where airtable_id = 'recTEST';
  if n = 1 then passed := passed + 1; else failures := failures || E'\n- admin cannot read payroll archive'; end if;
  execute 'reset role';

  -- ---------- 4. supervisor on job 1 ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_sup, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; select count(*) into n from public.jobs where street like 'Test %';
  if n = 2 then passed := passed + 1; else failures := failures || format(E'\n- supervisor sees %s jobs, expected 2', n); end if;
  total := total + 1; update public.jobs set brick_notes = 'sup edit' where id = job1; get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := failures || E'\n- supervisor cannot edit their own job'; end if;
  total := total + 1; update public.jobs set brick_notes = 'sup edit' where id = job2; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- supervisor edited a job they do not supervise'; end if;
  total := total + 1; select count(*) into n from public.payroll_archive_labor_types;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- supervisor can read payroll archive'; end if;
  execute 'reset role';

  -- ---------- 5. unassigned supervisor ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_sup2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; update public.jobs set brick_notes = 'x' where id = job1; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- unassigned supervisor edited job 1'; end if;
  execute 'reset role';

  -- ---------- 6. employee on job 2 ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_emp, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; select count(*) into n from public.jobs where street like 'Test %';
  if n = 1 then passed := passed + 1; else failures := failures || format(E'\n- employee sees %s jobs, expected 1', n); end if;
  total := total + 1;
  begin
    insert into public.job_notes (job_id, body, author_id) values (job2, 'employee note', u_emp);
    passed := passed + 1;
  exception when insufficient_privilege then failures := failures || E'\n- employee cannot add a note to their job'; end;
  total := total + 1; update public.jobs set brick_notes = 'emp' where id = job2; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- employee edited a job'; end if;
  execute 'reset role';

  -- ---------- 7. crew manager of the brick crew on job 1 ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_crew, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; select count(*) into n from public.jobs where street like 'Test %';
  if n = 1 then passed := passed + 1; else failures := failures || format(E'\n- crew manager sees %s jobs, expected 1', n); end if;
  total := total + 1; select count(*) into n from public.sand_orders o join public.jobs j on j.id = o.job_id where j.street like 'Test %';
  if n = 1 then passed := passed + 1; else failures := failures || format(E'\n- crew manager sees %s sand orders, expected 1', n); end if;
  total := total + 1;
  begin
    insert into public.mortar_orders (job_id, bags) values (job1, 20);
    passed := passed + 1;
  exception when insufficient_privilege then failures := failures || E'\n- crew manager cannot order supplies for their job'; end;
  total := total + 1;
  begin
    insert into public.mortar_orders (job_id, bags) values (job2, 20);
    failures := failures || E'\n- crew manager ordered supplies for another crew''s job';
  exception when insufficient_privilege then passed := passed + 1; end;
  total := total + 1; update public.jobs set brick_notes = 'crew' where id = job1; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- crew manager edited the job itself'; end if;
  total := total + 1; select count(*) into n from public.construction_managers where name = 'TEST CM';
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- crew manager can read builder contacts'; end if;
  total := total + 1; select count(*) into n from public.profiles where id = u_bldr;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- crew manager can read a builder portal user'; end if;
  execute 'reset role';

  -- ---------- 8. builder A portal user ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u_bldr, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  total := total + 1; select count(*) into n from public.jobs where street like 'Test %';
  if n = 1 then passed := passed + 1; else failures := failures || format(E'\n- builder sees %s jobs, expected 1', n); end if;
  total := total + 1; select count(*) into n from public.jobs where id = job2;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder A can read builder B''s job'; end if;
  total := total + 1; select count(*) into n from public.sand_orders;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder can read material orders'; end if;
  total := total + 1; select count(*) into n from public.suppliers;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder can read suppliers'; end if;
  total := total + 1; select count(*) into n from public.payroll_archive_labor_types;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder can read payroll archive'; end if;
  total := total + 1; select count(*) into n from public.builders where name like 'TEST Builder %';
  if n = 1 then passed := passed + 1; else failures := failures || format(E'\n- builder sees %s builders, expected 1 (their own)', n); end if;
  total := total + 1; select count(*) into n from public.job_notes;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder can read internal job notes'; end if;
  total := total + 1; update public.jobs set brick_notes = 'bldr' where id = job1; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- builder edited a job'; end if;
  execute 'reset role';

  -- ---------- 9. signed-out (anon) ----------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  total := total + 1; select count(*) into n from public.jobs;
  if n = 0 then passed := passed + 1; else failures := failures || E'\n- signed-out visitor can read jobs'; end if;
  execute 'reset role';

  raise exception 'RLS SMOKE TEST: %/% passed%', passed, total,
    case when failures = '' then ' (rolled back)' else E'\nFAILURES:' || failures end;
end;
$test$;
