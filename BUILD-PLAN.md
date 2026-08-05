# Leander 3T — Build Plan

Ordered milestones for the Leander 3T platform. Client has approved the project; this plan takes it from empty repo to cutover.

**Build order decision:** the team app UI comes first, running on seeded fake data. This gets a clickable, demoable product in front of the client early and lets the schema prove itself under real screens before we import 2,000+ jobs of live history.

Work milestones in order. Each has a definition of done — don't move on until it's met.

---

## M0 — Foundation

Set up the project so every later milestone is mechanical.

- [ ] `create-next-app` with TypeScript, App Router, Tailwind; ESLint + Prettier configured
- [ ] shadcn/ui initialized; theme mapped to the Coursework tokens in `CLAUDE.md`
- [ ] Fonts wired (Barlow Condensed, Barlow, IBM Plex Mono) via `next/font`
- [ ] Supabase project created; local dev via Supabase CLI; `.env.local` + `.env.example`
- [ ] Supabase server/browser client helpers in `lib/supabase/`
- [ ] Vercel project connected to the GitHub repo; preview deploys on PRs
- [ ] `npm run typecheck`, `lint`, `build` all pass in CI

**Done when:** a placeholder page deploys to a Vercel preview URL with brand fonts and colors applied.

---

## M1 — Schema and security

The whole data model, before any screens. Everything in `supabase/migrations/`.

- [ ] `profiles` (id → auth.users, full_name, role enum: admin/supervisor/employee/builder, builder_id nullable, active)
- [ ] `builders`, `construction_managers`, `suppliers`
- [ ] `jobs` — house_number, street, generated `property_address`, subdivision, area, elevation, plan_name, builder_id, construction_manager_id, status enum, per-trade spec columns (brick/stone/stucco: sqft, color, mortar_color, drop_ft, start/end dates, crew), completion_percent, job_completed_date, notes
- [ ] `job_supervisors` join table (a job can have multiple supervisors)
- [ ] Order tables: `sand_orders`, `mortar_orders`, `lintel_orders`, `arch_lintel_orders`, `rock_orders`, `stucco_material_orders`, `paint_orders` — each with job_id, supplier_id, order_number, ordered bool, ordered_date, requested_delivery_date, notes, created_by, plus type-specific columns (see glossary in `CLAUDE.md`)
- [ ] `address_block_orders`, `job_photos`, `job_documents`, `info_requests`
- [ ] `payroll_archive` tables — imported later, read-only, no UI
- [ ] Lookup tables for select values (mortar colors, brick colors, crews) — **consolidate legacy typos** ("White"/"whtie"/"whiote" → one value)
- [ ] RLS enabled on every table + policies per the role matrix in `CLAUDE.md`
- [ ] Triggers: ordered-date stamp, completion→status+date, address block dates, stone start/end
- [ ] Storage buckets: `plans`, `photos`, `order-forms` (private; signed URLs only)
- [ ] Generated types committed to `lib/supabase/types.ts`

**Done when:** a supervisor test user can only read/write what the role matrix allows, verified by SQL tests against seeded users.

---

## M2 — Seed data

Credible fake data so the UI can be built and demoed before migration.

- [ ] Seed script in `supabase/seed/`: 5 builders with CMs, 8 suppliers, 9 users across roles, ~60 jobs spread across subdivisions (Provence, Sonterra, Cielo East, Lagos, The Grove Church), mixed trade combinations and statuses, orders of every type, photos, a few info requests
- [ ] Addresses, plan names, and colors match Central Texas conventions (Country Hill brick, White 4,6,8 stone, Type S — Gray mortar)
- [ ] Idempotent: re-runnable without duplicating

**Done when:** `npm run seed` produces a database that looks like a real month at Leander 3T.

---

## M3 — Auth and app shell

- [ ] Supabase Auth: email/password sign-in, password reset, invite flow
- [ ] Middleware guarding `(app)` and `(portal)` route groups; role-aware redirects
- [ ] App shell: charcoal sidebar, nav, user block with role label (match mockup)
- [ ] `/profile` and `/team`

**Done when:** each of the four roles lands somewhere correct and cannot reach another role's routes.

---

## M4 — Jobs (the core)

- [ ] `/jobs` — server-paginated table with search across address, builder, subdivision, plan; status filter chips; RLS-scoped automatically
- [ ] `/jobs/[id]` — spec cards per trade (brick/stone/stucco) with colors, mortar, SF, drop, schedule, crew; completion bar; edit actions
- [ ] `/jobs/new` and edit forms (React Hook Form + Zod), including builder/CM selection
- [ ] Photo gallery: upload to `photos` bucket, captions, date stamps, delete with confirm
- [ ] Plans/documents upload to `plans` bucket
- [ ] Kanban view toggle by status (replaces the legacy Airtable Kanban)

**Done when:** a supervisor can run a job end-to-end — create it, set specs, upload plans, add photos, mark it complete — and the triggers stamp dates correctly.

---

## M5 — Material orders

- [ ] Order sections on the job detail page, one per type, matching the legacy layout
- [ ] Add/edit dialogs per order type with the right fields; lintel quick-add buttons for 3x4 (¼") and 4x4 (⅜")
- [ ] Stucco material order form with its ~20 line items, grouped sensibly
- [ ] Supplier assignment and requested delivery dates
- [ ] `/orders` cross-job view for the office: everything pending, by status and supplier

**Done when:** every order type from the legacy system can be created and edited, and `ordered_date` stamps itself.

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

- [ ] `/` — the approved mockup design: hero, trades section with material photography, trust band, stats, process, contact
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
