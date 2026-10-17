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

## Demo data

`supabase/seed/demo.sql` loads a credible month at Leander 3T: 5 builders, 60 jobs across five subdivisions, orders of every type, and 13 demo sign-ins covering every role. It is safe to re-run.

```bash
npm run seed         # load (or reload) demo data
npm run seed:clear   # remove all demo data — run before the Airtable import
```

Demo sign-ins use magic links only (no passwords). Each is a plus address of the owner's Gmail, e.g. `dawhatle+l3t-ramon@gmail.com` (crew manager), `dawhatle+l3t-sam@gmail.com` (Ashton Woods builder portal), `dawhatle+l3t-gerardo@gmail.com` (supervisor). Supplier and construction-manager emails are `example.com` addresses, so no demo order can reach a real supplier.

## Sign-in setup (Supabase dashboard, one time)

People sign in with email + password, or with a link emailed to them. Every emailed link goes to `/auth/confirm` on this site.

1. **Authentication → URL Configuration**
   - Site URL: `https://leander3-t-application.vercel.app` (change to `https://leander3t.com` at cutover)
   - Redirect URLs: `https://leander3-t-application.vercel.app/**`, `https://*-dawhatle-alts-projects.vercel.app/**`, `http://localhost:3000/**`
2. **Authentication → Emails → Templates:** paste the matching file from `supabase/templates/` into *Invite user*, *Magic link*, *Reset password* and *Confirm signup*. The subjects are in `supabase/config.toml`.
3. **Authentication → Emails → SMTP Settings:** turn on custom SMTP with Resend (host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key, sender e.g. `office@leander3t.com` on a verified domain). Supabase's built-in sender only delivers to members of the Supabase team and only a few per hour.
4. **Vercel:** `SUPABASE_SERVICE_ROLE_KEY` must be set (server-only) for invitations from `/team`.

Demo sign-ins have no password. Use **Email me a sign-in link instead**, or **Forgot password?** to set one.
