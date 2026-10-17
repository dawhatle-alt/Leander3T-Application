-- Remove every demo row created by supabase/seed/demo.sql.
-- Run before the Airtable import (M10):  npm run seed:clear
--
-- Jobs go first; their orders, notes, assignments, address blocks and stucco
-- line items cascade with them. Real (non-demo) rows are never touched.

delete from public.jobs                  where demo;
delete from public.info_requests         where demo;
delete from public.crews                 where demo;
delete from public.construction_managers where demo;
delete from public.builders              where demo;
delete from public.suppliers             where demo;
delete from auth.users                   where raw_app_meta_data ->> 'demo' = 'true';  -- profiles cascade
