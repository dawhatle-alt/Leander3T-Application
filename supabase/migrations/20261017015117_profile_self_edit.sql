-- M3 · People edit their own name and phone on /profile.
-- Admins keep full control. Everyone else may update only their own row, and a
-- trigger stops them changing anything an admin owns (role, company, crew-
-- manager link, email, active flag, import id). One UPDATE policy, not two,
-- so Postgres evaluates a single policy per row.

alter policy "Admins edit profiles" on public.profiles rename to "Update profiles";
alter policy "Update profiles" on public.profiles
  using ((select private.is_admin()) or id = (select auth.uid()))
  with check ((select private.is_admin()) or id = (select auth.uid()));

create function private.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null for the service role and SQL run by the owner.
  if (select auth.uid()) is not null
     and not private.is_admin()
     and (new.id                      is distinct from old.id
       or new.role                    is distinct from old.role
       or new.builder_id              is distinct from old.builder_id
       or new.construction_manager_id is distinct from old.construction_manager_id
       or new.email                   is distinct from old.email
       or new.active                  is distinct from old.active
       or new.airtable_id             is distinct from old.airtable_id)
  then
    raise exception 'Only an administrator can change role, company, email or access.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function private.guard_profile_columns();
