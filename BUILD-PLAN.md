# Leander 3T — Build Plan

Ordered milestones for the Leander 3T platform. Client has approved the project; this plan takes it from empty repo to cutover.

**Build order decision:** the team app UI comes first, running on seeded fake data. This gets a clickable, demoable product in front of the client early and lets the schema prove itself under real screens before we import 2,000+ jobs of live history.

Work milestones in order. Each has a definition of done — don't move on until it's met.

---

## M0 — Foundation

Set up the project so every later milestone is mechanical.

- [x] `create-next-app` with TypeScript, App Router, Tailwind; ESLint + Prettier configured
- [x] shadcn/ui initialized; theme mapped to the Coursework tokens in `CLAUDE.md` (`components.json`, `app/globals.css`, `components/ui/button.tsx`)
- [x] Fonts wired (Barlow Condensed, Barlow, IBM Plex Mono) via `next/font`
- [x] Supabase project created (`Leander3T`, `mbpinvgomfjmbpwyqaiv`); local dev via Supabase CLI (`supabase/config.toml`); `.env.example` (copy to `.env.local`)
- [x] Supabase server/browser client helpers in `lib/supabase/`
- [x] Vercel project connected to the GitHub repo; preview deploys on PRs (production live at leander3-t-application.vercel.app, 2026-10-16)
- [x] `npm run typecheck`, `lint`, `format:check`, `build` all run in CI (`.github/workflows/ci.yml`)

**Done when:** a placeholder page deploys to a Vercel preview URL with brand fonts and colors applied.

---

## M1 — Schema and security

The whole data model, before any screens. Everything in `supabase/migrations/`, applied to `Leander3T` on 2026-10-17.

- [x] `profiles` (id → auth.users, full_name, role enum: admin/supervisor/employee/crew_manager/builder, builder_id nullable, active). A new auth user gets a profile automatically; role and builder come only from server-set `app_metadata`.
- [x] `builders`, `construction_managers`, `suppliers`
- [x] `jobs` — house_number, street, generated `property_address`, subdivision, area (+ `area_directions` split from the legacy field), elevation, plan_name, builder_id, construction_manager_id, status enum, per-trade spec columns (brick/stone/stucco: sqft, color, mortar_color, drop_ft, start/end dates, crew), completion_percent, job_completed_date, notes
- [x] `job_assignments` join table (job, person, kind = supervisor | employee) — a job can have several supervisors, and employees are assigned the same way. Replaces the planned `job_supervisors`.
- [x] `crews` (name, trade, `crew_manager_id`); the per-trade crew columns on `jobs` reference `crews.id`. The crew link lives on `crews`, not on `profiles`, so one crew manager can lead more than one crew.
- [x] Order tables: `sand_orders`, `mortar_orders`, `lintel_orders`, `arch_lintel_orders`, `rock_orders`, `stucco_material_orders`, `paint_orders` — each with job_id, supplier_id, order_number, ordered bool, ordered_date, requested_delivery_date, notes, created_by, plus type-specific columns
- [x] Stucco line items in `stucco_order_items` (quantity **and unit**) against a `stucco_items` catalog of 18 items — legacy rows mix units ("2" cases vs "60 pieces") and both must survive the import
- [x] `address_block_orders`, `job_photos`, `job_documents`, `job_notes`, `info_requests`
- [x] `payroll_archive_*` tables — imported later, read-only (admins select; no write policies), no UI
- [x] Lookup tables for select values (`mortar_colors` seeded with 7 clean values, `brick_colors`) — legacy typos get mapped on import
- [x] RLS enabled on every table + policies per the role matrix in `CLAUDE.md`. Access helpers live in a `private` schema so they can't be called through the API.
- [x] Triggers: ordered-date stamp, completion→status+date, address block dates, stone start/end (follows brick on jobs with stone SF, unless stone dates were set by hand)
- [x] Storage buckets: `plans`, `photos`, `order-forms` (private; paths start with the job id; signed URLs only)
- [x] Generated types committed to `lib/supabase/types.ts`
- [x] `20261017004500_consolidate_policies.sql` — performance-only cleanup (one read policy per table; access unchanged). Applied.

**Done when:** a supervisor test user and a crew manager test user can each only read/write what the role matrix allows (a crew manager reads only their crew's jobs and creates orders only on them), verified by SQL tests against seeded users. **Met 2026-10-17:** `supabase/tests/rls_smoke_test.sql`, 30/30 checks passed against the live project, fully rolled back.

---

## M2 — Seed data

Credible fake data so the UI can be built and demoed before migration.

- [x] Seed script `supabase/seed/demo.sql`: 5 builders with 10 CMs, 8 suppliers (fake emails), 13 magic-link sign-ins across every role (4 admin, 4 supervisor, 1 employee, 3 crew managers, 1 Ashton Woods CM), 5 crews, 60 jobs in Provence, Sonterra, Lagos, Cielo East and The Grove Church, mixed trades and statuses, orders of all seven types, address blocks, notes, 4 info requests. **Photos are not seeded** — they need real files in storage and arrive with M4 uploads.
- [x] Addresses, plan names, and colors match Central Texas conventions (Country Hill brick, White 4,6,8 stone, Type S — Gray mortar)
- [x] Idempotent: re-runnable without duplicating (fixed ids; clears previous demo rows first)
- [x] Removable: every demo row is tagged (`demo` column, or `app_metadata.demo` on sign-ins); `npm run seed:clear` removes them before the Airtable import (M10)

**Done when:** `npm run seed` produces a database that looks like a real month at Leander 3T. **Met 2026-10-16:** loaded into Leander3T. Spot checks: crew manager Ramon sees only his crew's 18 jobs (Provence, Lagos); builder Sam sees only Ashton Woods' 12 homes and no orders.

---

## M3 — Auth and app shell

- [x] Supabase Auth: email + password **and** emailed sign-in links (decision 2026-10-16), password reset, invite flow (admin invites from `/team`; the link signs them in and asks for a password)
- [x] All emailed links land on `/auth/confirm` (token_hash). Branded templates in `supabase/templates/`; same HTML goes into the hosted project's email settings
- [x] Middleware guarding every signed-in area; role-aware redirects (team → `/dashboard`, crew manager → `/crew`, builder → `/portal`); switched-off accounts are signed out
- [x] App shell: charcoal sidebar, nav, user block with role label (match `design/approved-mockup.html`); dark top bar for crew managers and the builder portal
- [x] `/profile` (name and phone; the database lets people change only those on their own row — migration `profile_self_edit`) and `/team`
- [x] Supabase dashboard: Site URL, redirect URLs and the four branded email templates (2026-10-17)
- [ ] Custom SMTP through Resend so emails reach people outside the Supabase team — needs a verified sending domain (see README → Sign-in setup)

**Done when:** each of the five roles lands somewhere correct and cannot reach another role's routes. Route rules checked for every role and area (70/70); signed-out redirects checked on a running build. **Met 2026-10-17** for Administration: emailed sign-in link on production lands on the dashboard. Other roles to be checked once Resend email is on.

---

## M4 — Jobs (the core)

- [x] `/jobs` — server-paginated table (25 a page) with search across address, builder, subdivision, plan and area; status filter chips; scoped by row-level security
- [x] `/jobs/[id]` — job header, completion bar, spec cards per trade (colors, mortar, SF, drop, schedule, crew), house & builder and dates cards, read-only material order summary (adding orders is M5), notes
- [x] `/jobs/new` and `/jobs/[id]/edit` (React Hook Form + Zod, one schema shared with the server action) covering every job field, including builder → CM selection and, for admins, the job's supervisors and employees
- [x] Photo gallery: phone photos shrunk to 2000px in the browser, uploaded to `photos`, caption + trade, date from the photo, full-screen view, delete with confirm
- [x] Plans/documents upload to `plans` (job editors), signed links, admin delete
- [x] Board view toggle by status (replaces the legacy Airtable Kanban; read-only, opens the job)

**Done when:** a supervisor can run a job end-to-end — create it, set specs, upload plans, add photos, mark it complete — and the triggers stamp dates correctly. Database side checked 2026-10-17 as supervisor Gerardo and employee Luis (rolled back): edits only own jobs, 100% → completed + date stamped, new job self-assigns, employees can't create or edit.

---

## M5 — Material orders

- [x] Order sections on the job page, one card per order type (shown for the job's trades; other types one tap away)
- [x] Add/edit dialog per order type from one definition (`lib/orders/types.ts`); lintel quick-add buttons for 3x4 (1/4") and 4x4 (3/8"); new orders start from the job's specs (mortar color, stone color/drop, paint colors)
- [x] Stucco supply order with sand, mortar and a quantity + unit for each of the 18 catalog items
- [x] Supplier list filtered to suppliers who carry that order type; requested delivery dates
- [x] Crew manager view: `/crew` → tap a job → specs + Request Materials. Requests are drafts that go to the office; "Waiting on the Office" lists them
- [x] `/orders` for the office: To Order (soonest delivery first) and Ordered (last 30 days), by type and supplier, with Mark Ordered
- [x] Office ticks "Ordered" (or Mark Ordered) → `ordered_date` stamps itself; unticking clears it
- [x] Database: crew managers can't place an order or change a placed one (migration `crew_manager_order_rules`, applied)
- [ ] **Apply `20261017190000_crew_manager_withdraw_drafts.sql`** (`npx supabase db push`): lets crew managers withdraw their own drafts and locks line-item removal on placed stucco orders. Until then a crew manager's "Withdraw" is refused and the office removes drafts.

**Done when:** every order type from the legacy system can be created and edited, `ordered_date` stamps itself, and a crew manager can order supplies for their crew's jobs and no others. Database side checked 2026-10-17 as Ramon (drafts only, own crew only, can't place or edit placed), Miguel + Cindy (stucco draft with line items → placed by office, date stamped → line items locked for Miguel).

---

## M6 — Order form PDFs and review queue

This replaces Documint and the email-chain workflow.

- [ ] PDF templates in `lib/pdf/`: Masonry, Paint, Stucco Supply — match the existing Documint layouts closely enough that suppliers notice no change (logo, company header, 127 Woodland Trail, property/job header block, line items)
- [ ] Route handler renders the PDF from job + order data, writes to the `order-forms` bucket, links it to the order, flips `ordered`, and notifies the review team via Resend
- [ ] Review queue UI: generated forms pending review, with preview, approve/send, and regenerate
- [ ] Dashboard "Needs Attention" panel fed by this queue

**Done when:** one click on a job produces a filed, branded PDF and an email to the review team — no third-party service in the path.

---

## M7 — Dashboard and admin

- [ ] `/dashboard` — stats (active jobs, new requests, orders pending review, completed), the four workflow cards (New Job, Update Job, Request Materials, My Jobs), Needs Attention queue, jobs-by-supervisor chart
- [ ] `/admin/builders`, `/admin/construction-managers`, `/admin/suppliers`, `/admin/users` (invite, role assignment, deactivate)
- [ ] `/admin/address-blocks`

**Done when:** an administrator can manage people and partners without touching the database.

---

## M8 — Public website

- [ ] `/` — the approved mockup design in `design/approved-mockup.html`: hero, trades section with material photography, trust band, stats, process, contact
- [ ] `/request-info` → `info_requests` + notification email; spam protection
- [ ] SEO basics: metadata, OG tags, sitemap, favicon from the logo
- [ ] Lighthouse: performance and accessibility ≥ 90 on mobile

**Done when:** the public site is production-ready pending DNS.

---

## M9 — Builder portal

The headline new capability. Scope discipline matters here: builders see **status**, never internals.

- [ ] `/portal` — welcome header scoped to their builder, stats (active homes, crews on site, scheduled this week, completed this year)
- [ ] Featured/active home cards with per-trade progress, schedule dates, specs on file, recent photos
- [ ] `/portal/homes/[id]` — full read-only home view
- [ ] Job request submission → intake queue in the team app
- [ ] Recent updates feed; Leander 3T contact card (supervisor + office)
- [ ] Builder user invite flow from `/admin/builders`
- [ ] **Security test:** a builder user provably cannot read another builder's jobs, suppliers, costs, or payroll archive — test at the SQL layer, not just the UI

**Done when:** signed in as a test Ashton Woods CM, the portal shows only Ashton Woods homes and every attempt to reach anything else fails at the database.

---

## M10 — Data migration

Now that the schema is proven under real screens, bring the history across.

- [ ] Extract script: pull all 17 Airtable tables via API, preserving record IDs
- [ ] Transform: field mapping per the migration plan; record-ID → UUID crosswalk; select-value normalization; flag test records ("TEST DATA Drive") for exclusion
- [ ] Load in dependency order; idempotent and re-runnable
- [ ] **Attachment migration** (the long pole): walk every attachment field, fetch fresh Airtable URLs (they expire), download, upload to the right bucket, record paths. Resumable with progress logging; reconcile counts.
- [ ] Verification report: row counts per table, join spot-checks, attachment reconciliation
- [ ] Delta run capability for cutover (records modified since initial load)

**Done when:** the verification report is clean and the client can find a six-year-old job with its plans and photos.

---

## M11 — Parallel run and cutover

- [ ] Team uses the new app against migrated data while Airtable stays the system of record
- [ ] Punch list from real use, worked down
- [ ] Training walkthroughs; short written guides for common tasks
- [ ] Final delta migration
- [ ] DNS: leander3t.com → Vercel; email sending domain verified
- [ ] Backup/restore verified; monitoring and error alerting on
- [ ] Legacy tools kept read-only for 30 days as a safety net

**Done when:** the team is working exclusively in the new system and the old subscriptions are wound down.

---

## Later (separate engagement)

- Supplier portal: supplier logins, order acknowledgment, delivery confirmation
- Payroll module, if the client ever wants it rebuilt
- Native mobile wrapper for field photo capture
