-- Demo data for Leander 3T (M2).  Run: npm run seed
--
-- A credible month at Leander 3T: 5 builders, 10 construction managers,
-- 8 suppliers, 13 sign-ins across every role, 5 crews, 60 jobs in five
-- subdivisions, orders of all seven types, address blocks, notes, and
-- website info requests. Vocabulary (brick and stone colors, plans,
-- suppliers) comes from the real Airtable base.
--
-- Safe to re-run: it removes the previous demo data first, and uses fixed
-- ids, so links and bookmarks stay stable between runs. Every row is tagged
-- (demo = true, or app_metadata.demo on sign-ins) and removed by
-- supabase/seed/clear-demo.sql.
--
-- Sign-ins: magic link only, no passwords. Every demo user's email is a
-- plus address of the owner's Gmail, so all links land in one inbox.
-- Dates are relative to the day the seed runs.

begin;

-- ---------------------------------------------------------------- reset
delete from public.jobs                  where demo;
delete from public.info_requests         where demo;
delete from public.crews                 where demo;
delete from public.construction_managers where demo;
delete from public.builders              where demo;
delete from public.suppliers             where demo;
delete from auth.users                   where raw_app_meta_data ->> 'demo' = 'true';

-- Stable ids: md5 of a readable key, e.g. md5('l3t-demo:builder:pulte')::uuid.

-- ---------------------------------------------------------------- builders
insert into public.builders (id, name, contact_name, contact_phone, contact_email, notes, demo)
select md5('l3t-demo:builder:' || slug)::uuid, name, contact, phone, email, notes, true
from (values
  ('ashton-woods',  'Ashton Woods',  'Sam Oehler',     '(512) 555-0141', 'sam.oehler@example.com',   'Provence. Brick + stone on most elevations.'),
  ('pulte',         'Pulte',         'Dana Whitfield', '(512) 555-0162', 'dana.whitfield@example.com','Sonterra, Jarrell. Highest volume builder.'),
  ('tri-pointe',    'Tri Pointe',    'Marcus Reyes',   '(512) 555-0177', 'marcus.reyes@example.com', 'Lagos, Manor. Brick only.'),
  ('masonwood',     'Masonwood',     'Kelly Brandt',   '(512) 555-0118', 'kelly.brandt@example.com', 'Cielo East. Three-coat stucco.'),
  ('lott-brothers', 'Lott Brothers', 'Travis Lott',    '(512) 555-0125', 'travis.lott@example.com',  'The Grove Church. Stone + stucco.')
) as b (slug, name, contact, phone, email, notes);

-- Two construction managers per builder.
insert into public.construction_managers (id, builder_id, name, phone, email, demo)
select md5('l3t-demo:cm:' || cm_slug)::uuid, md5('l3t-demo:builder:' || builder_slug)::uuid,
       name, phone, email, true
from (values
  ('sam-oehler',      'ashton-woods',  'Sam Oehler',      '(512) 555-0141', 'sam.oehler@example.com'),
  ('brianna-cole',    'ashton-woods',  'Brianna Cole',    '(512) 555-0143', 'brianna.cole@example.com'),
  ('dana-whitfield',  'pulte',         'Dana Whitfield',  '(512) 555-0162', 'dana.whitfield@example.com'),
  ('hector-salinas',  'pulte',         'Hector Salinas',  '(512) 555-0164', 'hector.salinas@example.com'),
  ('marcus-reyes',    'tri-pointe',    'Marcus Reyes',    '(512) 555-0177', 'marcus.reyes@example.com'),
  ('jenna-park',      'tri-pointe',    'Jenna Park',      '(512) 555-0179', 'jenna.park@example.com'),
  ('kelly-brandt',    'masonwood',     'Kelly Brandt',    '(512) 555-0118', 'kelly.brandt@example.com'),
  ('omar-haddad',     'masonwood',     'Omar Haddad',     '(512) 555-0119', 'omar.haddad@example.com'),
  ('travis-lott',     'lott-brothers', 'Travis Lott',     '(512) 555-0125', 'travis.lott@example.com'),
  ('rebecca-lindsey', 'lott-brothers', 'Rebecca Lindsey', '(512) 555-0127', 'rebecca.lindsey@example.com')
) as c (cm_slug, builder_slug, name, phone, email);

-- ---------------------------------------------------------------- suppliers
-- Real supplier names from Airtable, with fake contact details so no demo
-- order can ever reach a real supplier.
insert into public.suppliers (id, name, order_types, email, phone, demo)
select md5('l3t-demo:supplier:' || slug)::uuid, name, types::public.order_type[], email, phone, true
from (values
  ('e-castro',   'E Castro Trucking',          '{sand,rock}',             'orders@ecastro.example.com',   '(512) 555-0201'),
  ('mastercast', 'Mastercast',                 '{mortar,stucco_material}','orders@mastercast.example.com','(512) 555-0202'),
  ('ahi',        'AHI',                        '{mortar,stucco_material}','orders@ahi.example.com',       '(512) 555-0203'),
  ('512-supply', '512 Supply & Fabrication',   '{lintel,arch_lintel}',    'orders@512supply.example.com', '(512) 555-0204'),
  ('jj-stone',   'J & J Stone',                '{rock}',                  'orders@jjstone.example.com',   '(512) 555-0205'),
  ('cobra',      'Cobra Stone',                '{rock}',                  'orders@cobrastone.example.com','(512) 555-0206'),
  ('sherwin',    'Sherwin Williams',           '{paint}',                 'orders@sw-leander.example.com','(512) 555-0207'),
  ('acme',       'Acme Brick',                 '{}',                      'orders@acme.example.com',      '(512) 555-0208')
) as s (slug, name, types, email, phone);

-- ---------------------------------------------------------------- sign-ins
-- auth.users rows; the on_auth_user_created trigger creates each profile with
-- the role and builder from app_metadata.
with people (slug, full_name, role, builder_slug, phone) as (values
  ('admin',     'Darrell Whatley', 'admin',        null,           '(512) 260-2577'),
  ('harlee',    'Harlee Moreno',   'admin',        null,           '(512) 555-0301'),
  ('cindy',     'Cindy Alvarez',   'admin',        null,           '(512) 555-0302'),
  ('jackson',   'Jackson Pruitt',  'admin',        null,           '(512) 555-0303'),
  ('gerardo',   'Gerardo Lopez',   'supervisor',   null,           '(512) 555-0311'),
  ('jose',      'Jose Ramirez',    'supervisor',   null,           '(512) 555-0312'),
  ('paco',      'Paco Medina',     'supervisor',   null,           '(512) 555-0313'),
  ('carlos',    'Carlos Treviño',  'supervisor',   null,           '(512) 555-0314'),
  ('luis',      'Luis Herrera',    'employee',     null,           '(512) 555-0321'),
  ('ramon',     'Ramon Medina',    'crew_manager', null,           '(512) 555-0331'),
  ('javier',    'Javier Ortiz',    'crew_manager', null,           '(512) 555-0332'),
  ('miguel',    'Miguel Saenz',    'crew_manager', null,           '(512) 555-0333'),
  ('sam',       'Sam Oehler',      'builder',      'ashton-woods', '(512) 555-0141')
), ins as (
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select md5('l3t-demo:user:' || slug)::uuid,
         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'dawhatle+l3t-' || slug || '@gmail.com', now(),
         jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                            'role', role, 'demo', true)
           || case when builder_slug is null then '{}'::jsonb
                   else jsonb_build_object('builder_id', md5('l3t-demo:builder:' || builder_slug)::uuid) end,
         jsonb_build_object('full_name', full_name),
         now(), now(), '', '', '', ''
  from people
  returning id, email
)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select ins.id::text, ins.id,
       jsonb_build_object('sub', ins.id::text, 'email', ins.email, 'email_verified', true),
       'email', null, now(), now()
from ins;

update public.profiles p
set phone = v.phone,
    construction_manager_id = case when v.slug = 'sam' then md5('l3t-demo:cm:sam-oehler')::uuid end
from (values
  ('admin','(512) 260-2577'),('harlee','(512) 555-0301'),('cindy','(512) 555-0302'),('jackson','(512) 555-0303'),
  ('gerardo','(512) 555-0311'),('jose','(512) 555-0312'),('paco','(512) 555-0313'),('carlos','(512) 555-0314'),
  ('luis','(512) 555-0321'),('ramon','(512) 555-0331'),('javier','(512) 555-0332'),('miguel','(512) 555-0333'),
  ('sam','(512) 555-0141')
) as v (slug, phone)
where p.id = md5('l3t-demo:user:' || v.slug)::uuid;

-- ---------------------------------------------------------------- crews
insert into public.crews (id, name, trade, crew_manager_id, demo)
select md5('l3t-demo:crew:' || slug)::uuid, name, trade::public.trade,
       case when manager is null then null else md5('l3t-demo:user:' || manager)::uuid end, true
from (values
  ('brick-1',  'Crew 1',        'brick',  null),
  ('brick-2',  'Crew 2',        'brick',  'ramon'),
  ('brick-3',  'Crew 3',        'brick',  null),
  ('stone-1',  'Stone Crew 1',  'stone',  'javier'),
  ('stucco-1', 'Stucco Crew 1', 'stucco', 'miguel')
) as c (slug, name, trade, manager);

-- ---------------------------------------------------------------- brick colors
-- Real color names from Airtable; kept (not demo-flagged) because the import
-- will use the same picklist.
insert into public.brick_colors (name, sort_order) values
  ('Country Hill', 10), ('Old Francisco', 20), ('Knob Hill', 30),
  ('Alpine', 40), ('Georgetown', 50), ('Fall Creek', 60)
on conflict (name) do nothing;

-- ---------------------------------------------------------------- jobs
-- 12 jobs in each of 5 subdivisions. Per subdivision: jobs 1-5 completed,
-- 6-10 in progress, 11-12 new.
with sub (k, subdivision, area, builder_slug, cm_a, cm_b, streets, base_no, plans,
          has_brick, has_stone, has_stucco, brick_color, brick_mortar, stone_color, stone_mortar,
          brick_crew_a, brick_crew_b, stone_crew, stucco_crew) as (values
  (1, 'Provence',         'Austin',       'ashton-woods',  'sam-oehler',     'brianna-cole',
      array['Grenadier Drive','Boise Drive'],          8301, array['Cheyenne','Lariat','Kerrville'],
      true,  true,  false, 'Country Hill',  'Type S — Gray', 'White 4,6,8',   'White',
      'brick-2', 'brick-2', 'stone-1', null),
  (2, 'Sonterra',         'Jarrell',      'pulte',         'dana-whitfield', 'hector-salinas',
      array['Adlai Avenue','Ottawa Street'],            101, array['Bandera','Frio','Taft'],
      true,  true,  false, 'Old Francisco', 'Wheat',         'Cream Chopped', 'Buff',
      'brick-1', 'brick-1', 'stone-1', null),
  (3, 'Lagos',            'Manor',        'tri-pointe',    'marcus-reyes',   'jenna-park',
      array['Medina Gap Drive','Paseo Lagos'],        16301, array['Keller','Lagos 40-2'],
      true,  false, false, 'Knob Hill',     'Type S — Gray', null,            null,
      'brick-2', 'brick-3', null,      null),
  (4, 'Cielo East',       'Leander',      'masonwood',     'kelly-brandt',   'omar-haddad',
      array['Emperador','Calle Cielo'],              17501, array['Toledo','Sevilla'],
      false, false, true,  null,            null,            null,            null,
      null,      null,      null,      'stucco-1'),
  (5, 'The Grove Church', 'Liberty Hill', 'lott-brothers', 'travis-lott',    'rebecca-lindsey',
      array['Ronald Reagan Blvd.','Grove Hollow Lane'], 23901, array['Hartford','Osprey'],
      false, true,  true,  null,            null,            'Texas Mix 468', 'White',
      null,      null,      'stone-1', 'stucco-1')
),
j as (
  select s.*, i,
         case when i <= 5 then 'completed' when i <= 10 then 'in_progress' else 'new' end as st,
         -- main start date for the job, relative to today
         case when i <= 5  then private.today_central() - (80 - i * 9)
              when i <= 10 then private.today_central() - (14 - (i - 6) * 3)
              else              private.today_central() + (i - 10) * 6 end as d_start
  from sub s cross join generate_series(1, 12) as i
)
insert into public.jobs (
  id, demo, company, house_number, street, subdivision, area, plan_name, plan_number, elevation,
  lot_swing, sqft, builder_id, construction_manager_id, status, completion_percent,
  date_received, targeted_completion_date, supply_delivery_date, job_completed_date,
  brick_sqft, brick_color_id, brick_mortar_color_id, brick_drop_slab_ft, brick_detail_ft,
  brick_start_date, brick_end_date, brick_completion_date, brick_crew_id,
  stone_sqft, stone_color, stone_mortar_color_id, stone_drop_ft,
  stone_start_date, stone_end_date, stone_completion_date, stone_crew_id,
  stucco_sqft, stucco_body_paint_color, stucco_trim_paint_color, stucco_percent_complete,
  stucco_start_date, stucco_end_date, stucco_completion_date, stucco_crew_id,
  has_fireplace, created_by
)
select
  md5('l3t-demo:job:' || k || ':' || i)::uuid, true,
  case when k = 5 and i = 12 then '3t_construction_solutions' else 'leander_3t' end::public.company,
  (base_no + i * 4)::text, streets[1 + (i % 2)], subdivision, area,
  plans[1 + (i % array_length(plans, 1))], (7000 + k * 100 + i)::text, chr(65 + (i % 4)),
  (array['right','left','right'])[1 + (i % 3)]::public.lot_swing,
  1850 + (i * 137) % 1400,
  md5('l3t-demo:builder:' || builder_slug)::uuid,
  md5('l3t-demo:cm:' || case when i % 2 = 0 then cm_a else cm_b end)::uuid,
  st::public.job_status,
  case st when 'completed' then 100 when 'in_progress' then 15 + (i - 6) * 17 else 0 end,
  d_start - 21, d_start + 24, d_start - 2,
  case when st = 'completed' then d_start + 18 end,
  -- brick
  case when has_brick then 1150 + (i * 53) % 700 end,
  case when has_brick then (select id from public.brick_colors where name = brick_color) end,
  case when has_brick then (select id from public.mortar_colors where name = brick_mortar) end,
  case when has_brick then 40 + (i * 7) % 40 end,
  case when has_brick and i % 3 = 0 then 18 + i end,
  case when has_brick then d_start end,
  case when has_brick then d_start + 10 end,
  case when has_brick and st = 'completed' then d_start + 10 end,
  case when has_brick then md5('l3t-demo:crew:' || case when i % 2 = 0 then brick_crew_a else brick_crew_b end)::uuid end,
  -- stone (after brick when both)
  case when has_stone then 240 + (i * 31) % 400 end,
  stone_color,
  case when has_stone then (select id from public.mortar_colors where name = stone_mortar) end,
  case when has_stone then 10 + i % 15 end,
  case when has_stone then d_start + case when has_brick then 11 else 0 end end,
  case when has_stone then d_start + case when has_brick then 16 else 6 end end,
  case when has_stone and st = 'completed' then d_start + case when has_brick then 16 else 6 end end,
  case when has_stone then md5('l3t-demo:crew:' || stone_crew)::uuid end,
  -- stucco
  case when has_stucco then 2200 + (i * 97) % 1200 end,
  case when has_stucco then (array['Egret White SW7570','Incredible White SW7028','Agreeable Gray SW7029'])[1 + i % 3] end,
  case when has_stucco then (array['Tricorn Black SW6258','Urbane Bronze SW7048'])[1 + i % 2] end,
  case when has_stucco then case st when 'completed' then 100 when 'in_progress' then 15 + (i - 6) * 17 else 0 end end,
  case when has_stucco then d_start + case when has_stone then 7 else 0 end end,
  case when has_stucco then d_start + case when has_stone then 18 else 12 end end,
  case when has_stucco and st = 'completed' then d_start + case when has_stone then 18 else 12 end end,
  case when has_stucco then md5('l3t-demo:crew:' || stucco_crew)::uuid end,
  i % 4 = 0,
  md5('l3t-demo:user:harlee')::uuid
from j;

-- Fireplace notes and a few general notes, as the office writes them.
update public.jobs set fireplace_notes = 'Stone surround to mantel, hearth flush with slab.'
where demo and has_fireplace;
update public.jobs set additional_notes = 'Gate code 4417. Dumpster on the left side of the lot.'
where demo and id in (md5('l3t-demo:job:1:7')::uuid, md5('l3t-demo:job:2:8')::uuid);
update public.jobs set brick_notes = 'Rowlock sills at all front windows. Soldier course over garage.'
where demo and id in (md5('l3t-demo:job:1:6')::uuid, md5('l3t-demo:job:3:9')::uuid);

-- ---------------------------------------------------------------- who is on each job
insert into public.job_assignments (job_id, profile_id, kind)
select j.id, md5('l3t-demo:user:' || case j.subdivision
         when 'Provence' then 'gerardo' when 'Sonterra' then 'jose'
         when 'Lagos' then 'paco' else 'carlos' end)::uuid, 'supervisor'
from public.jobs j where j.demo;

insert into public.job_assignments (job_id, profile_id, kind)
select md5('l3t-demo:job:' || k || ':' || i)::uuid, md5('l3t-demo:user:luis')::uuid, 'employee'
from (values (1, 6), (1, 7), (1, 8), (2, 6), (2, 7)) as v (k, i);

-- ---------------------------------------------------------------- address blocks
insert into public.address_block_orders (job_id, status, ordered_date, delivered_date)
select j.id,
       case when j.status = 'completed' then 'delivered'
            when j.status = 'in_progress' then case when j.completion_percent >= 50 then 'delivered' else 'ordered' end
            else 'none' end::public.address_block_status,
       case when j.status <> 'new' then coalesce(j.brick_start_date, j.stone_start_date, j.stucco_start_date) - 12 end,
       case when j.status = 'completed' or j.completion_percent >= 50
            then coalesce(j.brick_start_date, j.stone_start_date, j.stucco_start_date) - 4 end
from public.jobs j where j.demo;

-- ---------------------------------------------------------------- material orders
-- Helper view of demo jobs with their main start date and whether orders are placed.
create temporary table demo_jobs on commit drop as
select j.*,
       coalesce(j.brick_start_date, j.stone_start_date, j.stucco_start_date) as d_start,
       (j.status <> 'new') as placed,
       ((right(j.plan_number, 2))::int) as i
from public.jobs j where j.demo;

-- Sand: brick and stone jobs. New jobs get a draft (not yet ordered).
insert into public.sand_orders (job_id, supplier_id, sand_type, yards, ordered, ordered_date,
                                requested_delivery_date, delivery_completed_date, created_by)
select id, md5('l3t-demo:supplier:e-castro')::uuid, 'Masonry', 9 + i % 6,
       placed, case when placed then d_start - 5 end, d_start - 2,
       case when status = 'completed' then d_start - 2 end,
       md5('l3t-demo:user:harlee')::uuid
from demo_jobs where brick_sqft is not null or stone_sqft is not null;

-- Mortar: one order per masonry trade, in that trade's mortar color.
insert into public.mortar_orders (job_id, supplier_id, mortar_color_id, bags, ordered, ordered_date,
                                  requested_delivery_date, created_by)
select id, md5('l3t-demo:supplier:' || case when i % 2 = 0 then 'mastercast' else 'ahi' end)::uuid,
       brick_mortar_color_id, 30 + i % 10, placed, case when placed then d_start - 5 end, d_start - 2,
       md5('l3t-demo:user:harlee')::uuid
from demo_jobs where brick_sqft is not null
union all
select id, md5('l3t-demo:supplier:mastercast')::uuid,
       stone_mortar_color_id, 12 + i % 6, placed, case when placed then stone_start_date - 4 end, stone_start_date - 1,
       md5('l3t-demo:user:harlee')::uuid
from demo_jobs where stone_sqft is not null;

-- A crew manager's own request, still a draft: Ramon ordering extra mortar.
insert into public.mortar_orders (job_id, supplier_id, mortar_color_id, bags, ordered,
                                  requested_delivery_date, notes, created_by)
select id, md5('l3t-demo:supplier:mastercast')::uuid, brick_mortar_color_id, 20, false,
       private.today_central() + 2, 'Running short on the garage side.', md5('l3t-demo:user:ramon')::uuid
from demo_jobs where id = md5('l3t-demo:job:1:8')::uuid;

-- Lintels: the two quick-add sizes on every brick job.
insert into public.lintel_orders (job_id, supplier_id, lintel_type, quantity, inches, hole_pattern,
                                  ordered, ordered_date, requested_delivery_date, created_by)
select id, md5('l3t-demo:supplier:512-supply')::uuid, t.lintel_type, t.qty, t.inches + (i % 4) * 6, t.holes,
       placed, case when placed then d_start - 6 end, d_start - 2, md5('l3t-demo:user:harlee')::uuid
from demo_jobs
cross join (values
  ('3x4 (1/4")', 2, 54, '1 row 16" OC'),
  ('4x4 (3/8")', 1, 96, '2 rows 16" OC')
) as t (lintel_type, qty, inches, holes)
where brick_sqft is not null;

-- Arch lintels on every third brick job.
insert into public.arch_lintel_orders (job_id, supplier_id, arch_type, quantity, span_in, width_in, rise_in, legs,
                                       ordered, ordered_date, requested_delivery_date, created_by)
select id, md5('l3t-demo:supplier:512-supply')::uuid,
       'Arch Lintel - All 3/16 steel with 3/16 rib in middle', 1,
       (array[79, 68, 49.5, 55])[1 + i % 4], (array[18, 15.5, 17.5, 18])[1 + i % 4],
       (array[12, 9, 10, 7])[1 + i % 4], 3,
       placed, case when placed then d_start - 6 end, d_start - 2, md5('l3t-demo:user:harlee')::uuid
from demo_jobs where brick_sqft is not null and i % 3 = 0;

-- Rock: stone jobs.
insert into public.rock_orders (job_id, supplier_id, color_style, tons, stone_drop_ft,
                                ordered, ordered_date, requested_delivery_date, created_by)
select id, md5('l3t-demo:supplier:' || case when i % 2 = 0 then 'jj-stone' else 'cobra' end)::uuid,
       stone_color, 2 + (i % 4) * 0.5, stone_drop_ft,
       placed, case when placed then stone_start_date - 6 end, stone_start_date - 1,
       md5('l3t-demo:user:cindy')::uuid
from demo_jobs where stone_sqft is not null;

-- Stucco supply: one order per stucco job, with line items below.
insert into public.stucco_material_orders (id, job_id, supplier_id, sand_supplier, sand_type, sand_yards,
                                           mortar_supplier, mortar_color_id, mortar_bags, delivery_phone,
                                           ordered, ordered_date, requested_delivery_date, created_by)
select md5('l3t-demo:stucco-order:' || id)::uuid, id, md5('l3t-demo:supplier:ahi')::uuid,
       'E Castro Trucking', 'Washed', 4 + i % 3,
       'Mastercast', (select id from public.mortar_colors where name = 'Type S — Gray'), 25 + i % 8,
       '(512) 555-0333',
       placed, case when placed then stucco_start_date - 5 end, stucco_start_date - 2,
       md5('l3t-demo:user:cindy')::uuid
from demo_jobs where stucco_sqft is not null;

insert into public.stucco_order_items (order_id, item_code, quantity, unit)
select md5('l3t-demo:stucco-order:' || j.id)::uuid, it.code, it.qty + (j.i % 3), it.unit
from demo_jobs j
cross join (values
  ('jumbo_tex_2ply_t316',       5, 'rolls'),
  ('structural_lath_wire',      2, 'rolls'),
  ('corner_bead_double',        1, 'cases'),
  ('weep_hole_bead_3q',         1, 'cases'),
  ('foundation_weep_screed_3q', 1, 'cases'),
  ('expansion_joint_half',      1, 'cases'),
  ('foam_2x6x8',                3, 'pieces'),
  ('water_table',               7, 'pieces')
) as it (code, qty, unit)
where j.stucco_sqft is not null;

-- One legacy-style line where the crew counted pieces instead of cases.
update public.stucco_order_items
set quantity = 60, unit = 'pieces', note = 'Counted on site: 60 pieces'
where item_code = 'corner_bead_double'
  and order_id = md5('l3t-demo:stucco-order:' || md5('l3t-demo:job:4:7')::uuid)::uuid;

-- Paint: stucco jobs that have started.
insert into public.paint_orders (job_id, supplier_id, body_item_number, body_gallons, trim_item_number, trim_gallons,
                                 picked_up_by, ordered, ordered_date, requested_delivery_date, created_by)
select id, md5('l3t-demo:supplier:sherwin')::uuid,
       'SW-' || (6100 + i * 7), 8 + i % 5, 'SW-' || (6200 + i * 3), 2 + i % 2,
       case when status = 'completed' then 'Miguel' end,
       true, stucco_start_date + 6, stucco_start_date + 8, md5('l3t-demo:user:cindy')::uuid
from demo_jobs where stucco_sqft is not null and placed;

-- ---------------------------------------------------------------- job notes
insert into public.job_notes (job_id, body, author_id, created_at)
select md5('l3t-demo:job:' || k || ':' || i)::uuid, body, md5('l3t-demo:user:' || author)::uuid,
       now() - (days || ' days')::interval
from (values
  (1, 7,  'gerardo', 'North wall done. Waiting on the second lintel delivery for the garage.', 2),
  (1, 8,  'luis',    'Photos of the detail course uploaded. Mortar color matches the sample board.', 1),
  (2, 6,  'jose',    'Builder moved the stone start up two days. Crew confirmed.', 3),
  (3, 9,  'paco',    'Short 6 lintels on the rear elevation; added a draft order.', 1),
  (4, 7,  'carlos',  'Scratch coat on. Brown coat Thursday if the weather holds.', 2),
  (5, 8,  'carlos',  'Stone is up on the front columns. Stucco crew starts Monday.', 4)
) as n (k, i, author, body, days);

-- ---------------------------------------------------------------- website requests
insert into public.info_requests (id, demo, name, email, company_name, company_size, phone, notes, status,
                                  assignee_id, created_at)
select md5('l3t-demo:request:' || n)::uuid, true, name, email, company, size, phone, notes,
       status::public.request_status,
       case when assignee is null then null else md5('l3t-demo:user:' || assignee)::uuid end,
       now() - (days || ' days')::interval
from (values
  (1, 'Rachel Kim',     'rachel.kim@example.com',     'Highland Homes',     '250+',     '(512) 555-0401',
      'New community in Georgetown, 140 lots, brick and stone. Starts in February.', 'todo',        null,     1),
  (2, 'Tom Barrera',    'tom.barrera@example.com',    'Brightland Homes',   '50–250',   '(512) 555-0402',
      'Looking for a second masonry sub for Hutto. Can you send references?',       'in_progress', 'harlee', 4),
  (3, 'Angela Price',   'angela.price@example.com',   'Price Custom Builders','Under 50','(512) 555-0403',
      'Two custom homes in Spicewood, full stone.',                                'todo',        null,     6),
  (4, 'Victor Nguyen',  'victor.nguyen@example.com',  'David Weekley Homes','250+',     '(512) 555-0404',
      'Stucco pricing for 60 homes in Leander.',                                   'done',        'harlee', 12)
) as r (n, name, email, company, size, phone, notes, status, assignee, days);

commit;
