# Leander 3T — Job Management Platform

One Next.js app for Leander 3T, LLC: the public site, the team app and the builder portal. It replaces Softr, Airtable and Documint.

- **How to work in this repo:** `CLAUDE.md` (stack, roles, design system, conventions)
- **What's being built, in order:** `BUILD-PLAN.md`
- **What it should look like:** open `design/approved-mockup.html` in a browser

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase keys
npm run dev                  # http://localhost:3000
```

Supabase keys are in the dashboard for project **Leander3T** under Project Settings → API Keys. The service-role key is server-only; never expose it to the browser.

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

CI runs all four on every pull request.

## Database

The schema lives in `supabase/migrations/` and is the source of truth. Migrations are append-only: add a new file, never edit one that has been applied.

```bash
npx supabase login
npx supabase link --project-ref mbpinvgomfjmbpwyqaiv
npx supabase db push          # apply any migrations not yet on the project
npm run db:types              # regenerate lib/supabase/types.ts
```

`supabase/tests/rls_smoke_test.sql` checks what each role can see and change. Run it in the Supabase SQL editor; it rolls itself back and reports `RLS SMOKE TEST: n/n passed`.
