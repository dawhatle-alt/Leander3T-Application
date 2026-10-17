-- M5 · Crew managers can withdraw (delete) draft orders they created, and
-- can't remove line items from a placed stucco order.
-- NOT YET APPLIED to Leander3T: run `npx supabase db push` (or paste into the
-- Supabase SQL editor). Until then crew managers can't withdraw drafts.

do $$
declare
  t text;
begin
  foreach t in array array[
    'sand_orders', 'mortar_orders', 'lintel_orders', 'arch_lintel_orders',
    'rock_orders', 'stucco_material_orders', 'paint_orders'
  ] loop
    execute format(
      'alter policy "Admins delete orders; job editors delete unplaced orders" on public.%I rename to "Remove orders"', t);
    execute format($p$
      alter policy "Remove orders" on public.%I
        using ((select private.is_admin())
               or (not ordered
                   and ((select private.can_write_job(job_id))
                        or ((select private.current_app_role()) = 'crew_manager'
                            and created_by = (select auth.uid())
                            and (select private.can_read_job(job_id))))))
    $p$, t);
  end loop;
end;
$$;

drop trigger stucco_order_items_guard_crew_manager on public.stucco_order_items;
create trigger stucco_order_items_guard_crew_manager
  before insert or update or delete on public.stucco_order_items
  for each row execute function private.guard_crew_manager_stucco_items();
