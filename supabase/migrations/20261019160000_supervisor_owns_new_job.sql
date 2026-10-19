-- A supervisor who creates a job supervises it. Without this, the supervisor
-- could create a job but not edit it or add its plans and front elevation,
-- since only admins choose the team on the job form.
-- Written to be re-runnable: the rule was live before it was recorded here.

create or replace function private.assign_creating_supervisor()
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

drop trigger if exists jobs_assign_creating_supervisor on public.jobs;
create trigger jobs_assign_creating_supervisor
  after insert on public.jobs
  for each row execute function private.assign_creating_supervisor();
