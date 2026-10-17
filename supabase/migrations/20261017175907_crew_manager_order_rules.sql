-- M5 · Crew manager material requests go through the office.
-- Crew managers may create and edit DRAFT orders on their crew's jobs. Only
-- the office (admins and the job's supervisors) places an order
-- (ordered = true) or changes a placed one. See also
-- 20261017190000_crew_manager_withdraw_drafts.sql.

create function private.guard_crew_manager_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.current_app_role() = 'crew_manager' then
    if (tg_op = 'INSERT' and new.ordered)
       or (tg_op = 'UPDATE' and (old.ordered or new.ordered)) then
      raise exception 'Only the office can place an order or change a placed one.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Line items of a placed stucco order are locked for crew managers too.
create function private.guard_crew_manager_stucco_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  placed boolean;
begin
  if private.current_app_role() = 'crew_manager' then
    select o.ordered into placed
    from public.stucco_material_orders o
    where o.id = coalesce(new.order_id, old.order_id);
    if coalesce(placed, false) then
      raise exception 'Only the office can change a placed order.' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'sand_orders', 'mortar_orders', 'lintel_orders', 'arch_lintel_orders',
    'rock_orders', 'stucco_material_orders', 'paint_orders'
  ] loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function private.guard_crew_manager_orders()',
      t || '_guard_crew_manager', t);
  end loop;
end;
$$;

create trigger stucco_order_items_guard_crew_manager
  before insert or update on public.stucco_order_items
  for each row execute function private.guard_crew_manager_stucco_items();
