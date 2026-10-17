-- M1 · Storage buckets. All private; the app serves files through signed URLs.
-- Object paths start with the job id: "<job_id>/<file name>".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('plans', 'plans', false, 52428800,
     array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('photos', 'photos', false, 26214400,
     array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('order-forms', 'order-forms', false, 10485760,
     array['application/pdf']);

-- The job id from an object path, or null if the path doesn't start with one.
create function private.object_job_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_segment text := split_part(p_name, '/', 1);
begin
  return first_segment::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;
grant execute on function private.object_job_id(text) to authenticated;

-- photos: anyone who can see the job; staff on the job upload; admins or the uploader delete.
create policy "Read photos for jobs you can see"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos'
         and (select private.can_read_job(private.object_job_id(name))));

create policy "Staff on a job upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos'
              and (select private.is_staff())
              and (select private.can_read_job(private.object_job_id(name))));

create policy "Admins and uploaders delete photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos'
         and ((select private.is_admin()) or owner_id = (select auth.uid())::text));

-- plans: anyone who can see the job reads; job editors upload; admins delete.
create policy "Read plans for jobs you can see"
  on storage.objects for select to authenticated
  using (bucket_id = 'plans'
         and (select private.can_read_job(private.object_job_id(name))));

create policy "Job editors upload plans"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'plans'
              and (select private.can_write_job(private.object_job_id(name))));

create policy "Admins delete plans"
  on storage.objects for delete to authenticated
  using (bucket_id = 'plans' and (select private.is_admin()));

-- order-forms: staff who can see the job read; only the server writes them.
create policy "Staff read order forms for jobs they can see"
  on storage.objects for select to authenticated
  using (bucket_id = 'order-forms'
         and (select private.is_staff())
         and (select private.can_read_job(private.object_job_id(name))));
