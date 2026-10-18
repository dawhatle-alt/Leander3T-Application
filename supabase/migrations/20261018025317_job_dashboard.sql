-- Job Dashboard (replaces the Airtable "Job Information → Job Dashboard" page).
-- One call returns every figure on the page, aggregated in the database so it
-- stays fast once the full job history is imported.
--
-- security invoker: the caller's row-level security applies, so each person
-- only ever counts the jobs they may read.
--
-- Range filter is on date_received (inclusive both ends; null = open-ended).
-- The "completed" line of the trend uses job_completed_date in the same range.

create function public.job_dashboard(
  p_from date default null,
  p_to date default null,
  p_bucket text default 'week'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  unit as (
    select case when p_bucket = 'month' then 'month' else 'week' end as u
  ),
  scoped as (
    select j.id, j.status, j.builder_id
    from public.jobs j
    where (p_from is null or j.date_received >= p_from)
      and (p_to is null or j.date_received <= p_to)
  ),
  totals as (
    select jsonb_build_object(
      'total', count(*),
      'active', count(*) filter (where status in ('new', 'in_progress')),
      'new', count(*) filter (where status = 'new'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'completed', count(*) filter (where status = 'completed')
    ) as v
    from scoped
  ),
  sup as (
    -- Active jobs per supervisor; jobs with no supervisor are "Unassigned".
    select p.id as profile_id,
           coalesce(p.full_name, 'Unassigned') as name,
           count(distinct s.id) as n
    from scoped s
    left join public.job_assignments a
      on a.job_id = s.id and a.kind = 'supervisor'
    left join public.profiles p on p.id = a.profile_id
    where s.status in ('new', 'in_progress')
    group by p.id, p.full_name
  ),
  bld as (
    select b.id as builder_id,
           coalesce(b.name, 'No builder') as name,
           count(*) as total,
           count(*) filter (where s.status = 'new') as new,
           count(*) filter (where s.status = 'in_progress') as in_progress,
           count(*) filter (where s.status = 'completed') as completed
    from scoped s
    left join public.builders b on b.id = s.builder_id
    group by b.id, b.name
  ),
  bounds as (
    select
      coalesce(p_from, least(
        (select min(date_received) from public.jobs),
        (select min(job_completed_date) from public.jobs)
      ), current_date) as lo,
      coalesce(p_to, current_date) as hi
  ),
  buckets as (
    select generate_series(
      date_trunc((select u from unit), (select lo from bounds)::timestamp),
      date_trunc((select u from unit), (select hi from bounds)::timestamp),
      case when (select u from unit) = 'month'
        then interval '1 month' else interval '1 week' end
    )::date as b
  ),
  received as (
    select date_trunc((select u from unit), j.date_received::timestamp)::date as b,
           count(*) as n
    from public.jobs j
    where j.date_received is not null
      and (p_from is null or j.date_received >= p_from)
      and (p_to is null or j.date_received <= p_to)
    group by 1
  ),
  finished as (
    select date_trunc((select u from unit), j.job_completed_date::timestamp)::date as b,
           count(*) as n
    from public.jobs j
    where j.job_completed_date is not null
      and (p_from is null or j.job_completed_date >= p_from)
      and (p_to is null or j.job_completed_date <= p_to)
    group by 1
  )
  select jsonb_build_object(
    'totals', (select v from totals),
    'by_supervisor', coalesce((
      select jsonb_agg(jsonb_build_object(
               'profile_id', profile_id, 'name', name, 'n', n)
             order by n desc, name)
      from sup), '[]'::jsonb),
    'by_builder', coalesce((
      select jsonb_agg(jsonb_build_object(
               'builder_id', builder_id, 'name', name, 'total', total,
               'new', new, 'in_progress', in_progress, 'completed', completed)
             order by name)
      from bld), '[]'::jsonb),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bucket', k.b,
               'received', coalesce(r.n, 0),
               'completed', coalesce(f.n, 0))
             order by k.b)
      from buckets k
      left join received r on r.b = k.b
      left join finished f on f.b = k.b), '[]'::jsonb),
    'bucket', (select u from unit)
  );
$$;

revoke all on function public.job_dashboard(date, date, text) from public, anon;
grant execute on function public.job_dashboard(date, date, text) to authenticated;
