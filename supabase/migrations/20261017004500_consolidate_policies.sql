-- M1 · One read policy per table.
-- Postgres evaluates every permissive policy for a role and action, so several
-- overlapping SELECT policies cost more than one combined policy. Access is
-- unchanged: each combined policy is the OR of the ones it replaces.

-- "Admins manage …" FOR ALL policies also granted SELECT. Every one of these
-- tables already lets admins read through another policy, so split the admin
-- policy into insert / update / delete only.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('profiles',              'Admins manage profiles'),
      ('builders',              'Admins manage builders'),
      ('construction_managers', 'Admins manage construction managers'),
      ('suppliers',             'Admins manage suppliers'),
      ('crews',                 'Admins manage crews'),
      ('mortar_colors',         'Admins manage mortar colors'),
      ('brick_colors',          'Admins manage brick colors'),
      ('job_assignments',       'Admins manage job assignments'),
      ('stucco_items',          'Admins manage the stucco catalog')
    ) as t (tbl, pol)
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    execute format(
      'create policy "Admins add %s" on public.%I for insert to authenticated with check ((select private.is_admin()))',
      replace(r.tbl, '_', ' '), r.tbl);
    execute format(
      'create policy "Admins edit %s" on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      replace(r.tbl, '_', ' '), r.tbl);
    execute format(
      'create policy "Admins remove %s" on public.%I for delete to authenticated using ((select private.is_admin()))',
      replace(r.tbl, '_', ' '), r.tbl);
  end loop;
end;
$$;

-- Same split for the job-editor FOR ALL policies.
drop policy "Job editors manage address blocks" on public.address_block_orders;
create policy "Job editors add address blocks"
  on public.address_block_orders for insert to authenticated
  with check ((select private.can_write_job(job_id)));
create policy "Job editors edit address blocks"
  on public.address_block_orders for update to authenticated
  using ((select private.can_write_job(job_id)))
  with check ((select private.can_write_job(job_id)));
create policy "Job editors remove address blocks"
  on public.address_block_orders for delete to authenticated
  using ((select private.can_write_job(job_id)));

drop policy "Job editors and the job's crew managers manage stucco line items" on public.stucco_order_items;
create policy "Job editors and the job's crew managers add stucco line items"
  on public.stucco_order_items for insert to authenticated
  with check ((select private.can_order_for_job(private.stucco_order_job_id(order_id))));
create policy "Job editors and the job's crew managers edit stucco line items"
  on public.stucco_order_items for update to authenticated
  using ((select private.can_order_for_job(private.stucco_order_job_id(order_id))))
  with check ((select private.can_order_for_job(private.stucco_order_job_id(order_id))));
create policy "Job editors and the job's crew managers remove stucco line items"
  on public.stucco_order_items for delete to authenticated
  using ((select private.can_order_for_job(private.stucco_order_job_id(order_id))));

-- Merge the remaining overlapping SELECT policies.

drop policy "Team reads all profiles" on public.profiles;
drop policy "Crew managers read Leander 3T staff profiles" on public.profiles;
drop policy "Everyone reads their own profile" on public.profiles;
create policy "Read profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())                                              -- your own
    or (select private.is_team())                                         -- the team reads everyone
    or ((select private.current_app_role()) = 'crew_manager' and role <> 'builder')  -- crew managers: staff only
  );

drop policy "Staff read builders" on public.builders;
drop policy "Builders read their own company" on public.builders;
create policy "Read builders"
  on public.builders for select to authenticated
  using ((select private.is_staff()) or id = (select private.current_builder_id()));

drop policy "Team reads construction managers" on public.construction_managers;
drop policy "Builders read their own construction managers" on public.construction_managers;
create policy "Read construction managers"
  on public.construction_managers for select to authenticated
  using ((select private.is_team()) or builder_id = (select private.current_builder_id()));

drop policy "Staff on a job read its documents" on public.job_documents;
drop policy "Builders read plans and elevations for their jobs" on public.job_documents;
create policy "Read job documents"
  on public.job_documents for select to authenticated
  using (
    (select private.can_read_job(job_id))
    and ((select private.is_staff())
         or kind in ('plans', 'front_elevation', 'color_selection'))   -- builders: plans and selections only
  );

drop policy "Admins and supervisors read all jobs" on public.jobs;
drop policy "Employees read jobs they are assigned to" on public.jobs;
drop policy "Crew managers read their crew's jobs" on public.jobs;
drop policy "Builders read their own jobs" on public.jobs;
create policy "Read jobs"
  on public.jobs for select to authenticated
  using (
    (select private.current_app_role()) in ('admin', 'supervisor')
    or ((select private.current_app_role()) = 'employee'
        and exists (select 1 from public.job_assignments a
                    where a.job_id = jobs.id and a.profile_id = (select auth.uid())))
    or array[brick_crew_id] <@ (select private.my_crew_ids())
    or array[stone_crew_id] <@ (select private.my_crew_ids())
    or array[stucco_crew_id] <@ (select private.my_crew_ids())
    or builder_id = (select private.current_builder_id())
  );
