# Leander 3T — Job Management Platform

Custom application for **Leander 3T, LLC**, a masonry subcontractor in Leander, TX performing brick, stone, and stucco work for production homebuilders. This app replaces three tools: Softr (public site + logins), Airtable (database, forms, automations), and Documint (supplier order-form PDFs).

**One Next.js app serves three audiences:** the public marketing site, the internal team application, and a builder portal.

---

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript (strict) | Server Components by default |
| Styling | Tailwind CSS + shadcn/ui | Components live in `components/ui`, owned in-repo |
| Database / Auth / Storage | Supabase (Postgres, Auth, Storage, Edge Functions) | RLS on every table, no exceptions |
| Forms | React Hook Form + Zod | Zod schemas shared between client and server actions |
| PDFs | `@react-pdf/renderer` | Renders in a route handler; no headless Chrome on Vercel |
| Email | Resend | Called from server actions / route handlers only |
| Tables | TanStack Table (headless) + shadcn table primitives | Server-side pagination for the jobs list |
| Hosting | Vercel (Pro — commercial use) | Preview deploys per PR |

**Never** put a Supabase service-role key in client code. Server-only secrets stay in server actions, route handlers, or edge functions.

---

## Repo layout

```
app/
  (marketing)/          # public site: /, /request-info
  (app)/                # team app, auth-guarded: /dashboard, /jobs, /jobs/[id], /admin/*
  (portal)/             # builder portal, auth-guarded: /portal, /portal/homes/[id]
  api/                  # route handlers (PDF generation, webhooks)
components/
  ui/                   # shadcn primitives
  jobs/  orders/  portal/   # feature components
lib/
  supabase/             # server + browser clients, typed DB helpers
  validation/           # Zod schemas
  pdf/                  # order-form PDF templates
supabase/
  migrations/           # SQL migrations (source of truth for schema)
  seed/                 # seed + fake-data scripts
scripts/
  migration/            # one-time Airtable → Postgres import (Phase 5)
```

---

## Domain glossary

Use these terms in code and UI; they're what the client says out loud.

- **Job** — one house at one address. The central entity (~105 fields in the legacy system). Carries specs per trade.
- **Trades** — brick, stone, stucco. A job may have any combination. Each has its own colors, mortar color, square footage, drop footage, schedule, and crew.
- **Drop** — footage of brick/stone below grade or on a drop slab; tracked separately from wall SF.
- **Order types** — sand (yards), mortar (bags, by type/color), lintel (qty, inches, hole pattern; quick-adds for 3x4 ¼" and 4x4 ⅜"), arch lintel (span, width, rise, legs), rock (color/style, tons), stucco material (~20 line items: lath, beads, weep screed, expansion joints, foam), paint material (body/trim colors, gallons).
- **Ordered / Ordered Date** — an order is "placed" once its form is generated; the date stamps automatically.
- **Order form** — branded PDF sent to the supplier. Three layouts: Masonry, Paint, Stucco Supply.
- **Review team** — office staff (Harlee, Cindy, Jackson) who review generated order forms before they go out.
- **Builder** — homebuilder client (Ashton Woods, Pulte, Tri Pointe, Masonwood, Lott Brothers). Each has **construction managers** (CMs) who are the portal users.
- **Address block** — the stone/brick address marker; has its own order and delivery dates.

---

## Roles and access

| Role | Scope |
|---|---|
| `admin` (Administration) | Everything |
| `supervisor` | Reads all jobs; writes jobs they supervise; creates/edits orders on those jobs |
| `employee` | Reads assigned jobs; adds photos and notes |
| `builder` (portal) | Reads **only** their builder's jobs — status, schedule, specs, photos. Can submit job requests. Never sees costs, payroll, suppliers, or other builders. |

Enforce all of this with **row-level security policies**, not UI filtering. The legacy app filtered lists in the front end ("jobs managed by you"); that becomes a policy here. Every new table gets RLS enabled in the same migration that creates it.

---

## Design system ("Coursework")

Derived from the Leander 3T brand and approved by the client in the mockup. Tokens live in `app/globals.css` / Tailwind config.

```
charcoal  #211B17   limestone #F6F1E8   paper    #FFFFFF
mortar    #E6DCCB   ink       #241E19   muted    #75685C
amber     #F49F0A   flame     #E4590F   chalk    #C42B1F
green     #2F6B45   (success)  blue     #33638F  (info)
gradient  linear-gradient(135deg,#F9B234,#F49F0A 38%,#E4590F)
```

- **Type:** Barlow Condensed (uppercase headings, tight leading), Barlow (body), IBM Plex Mono (labels, IDs, dates, measurements).
- **Signature elements:** brick-coursing texture on dark sections; a thin `chalk` rule as a section accent (the mason's snapped line); amber→flame gradient reserved for primary actions.
- Measurements, order numbers, dates, and square footages render in mono — this reads as a trade tool, not a generic SaaS dashboard.
- Do not introduce new colors or a second UI library. Match the approved mockup.

---

## Conventions

- Server Components fetch data; Client Components (`"use client"`) only where interactivity requires it.
- Mutations go through **server actions** with Zod validation at the boundary. No client-side writes to Supabase for anything privileged.
- Database is the source of truth for derived data: use Postgres triggers for date stamps and status rollups (see below), not application code scattered across handlers.
- Migrations are append-only SQL in `supabase/migrations/`. Never edit an applied migration; add a new one.
- Types: generate from the database (`supabase gen types typescript`) into `lib/supabase/types.ts`. Don't hand-write row types.
- Money and measurements: store numerics as `numeric`, never float.
- Timestamps: `timestamptz`, UTC. Format for display in `America/Chicago`.
- Files: never store Airtable-style expiring URLs. Store the storage path; generate signed URLs at request time.

## Automation rules (replacing 16 live Airtable automations)

Implement as Postgres triggers unless a side effect (email, PDF) is involved:

1. When an order's `ordered` flips true → stamp `ordered_date`. (Replaces 5 duplicate automations.)
2. When a job's completion percent hits 100 → set status `completed` and stamp `job_completed_date`.
3. Address block: stamp order date and delivered date on their respective flags.
4. Stone start/end dates auto-set from schedule changes.
5. Order-form generation (PDF → storage → mark ordered → notify review team) runs in **one** server action. It is not a chain of triggers.

---

## What is out of scope

- **Payroll UI.** Legacy payroll tables are migrated as read-only archive data only. No payroll screens, no payroll math.
- **Supplier portal.** Designed for (schema and RLS anticipate it) but built in a later phase. Suppliers keep receiving emailed PDFs.
- **Lintel Order Details page.** Abandoned in the legacy app; do not recreate.
- Two-way sync with Airtable. The migration is one-way, at cutover.

---

## Working agreements

- Ask before adding a dependency. The stack above is deliberate and small.
- When a legacy behavior seems odd, assume it encodes a real trade requirement and ask rather than "fixing" it silently.
- Keep the client's vocabulary in the UI (see glossary). Never surface internal jargon like "RLS policy" or "edge function" in user-facing text.
- Every PR: `npm run typecheck` and `npm run lint` clean before it's considered done.
- Seeded data must look like real Central Texas jobs (real-sounding addresses, subdivisions, plan names, brick colors) so client demos are credible.
