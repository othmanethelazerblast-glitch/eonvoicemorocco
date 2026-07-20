# Scratchpad

Running notes on where this project stands, so picking it back up doesn't mean
re-deriving context from scratch. Update this when you finish a chunk of work;
prune stale entries rather than letting it grow forever.

## Product

Morocco e-invoicing SaaS. Primary users are **comptables / financial advisors**
who each manage several client companies (not single business owners
self-serving). `Organization` = the firm, `Company` = each client they manage.
An SME that signs up directly just has an `Organization` with exactly one
`Company` — same model either way.

## Stack

pnpm monorepo, Turborepo. `apps/web` (Next.js), `apps/api` (Fastify + tRPC),
`apps/mobile` (Expo, currently a shell), `packages/db` (Prisma, Supabase
Postgres), `packages/dgi-clearance`, `packages/pdf-generator`,
`packages/ubl-generator`, `packages/mailer`, `packages/shared-types`,
`packages/api-client`. Auth via Clerk (Organizations feature).

Repo: https://github.com/othmanethelazerblast-glitch/eonvoicemorocco.git

## What's built (as of 2026-07-20)

- Invoicing core: draft → issue → submit to DGI (stubbed) → PDF/UBL XML →
  credit notes. SHA-256 hash-chained, append-only status history. Real, not
  demo-ware.
- Company / Client / Product: full CRUD (create, edit, delete) with
  FK-conflict-safe deletes (e.g. can't delete a company that has invoices —
  clear error instead of a raw Postgres constraint error).
- Multi-tenancy: `Organization` → N `Company`, `CompanyAccess` grants a
  specific staff member access to a subset of client companies. Owner/admin
  Clerk roles implicitly see all companies in the org.
- Prospect email intake (magic-link onboarding): staff invite a prospect by
  email → prospect fills a public, no-login form with their company's legal
  identifiers → lands as a review item → staff approves it into a real
  `Company`. Nothing unauthenticated ever writes production data directly.
- Shared validation: one Zod schema per entity in
  `packages/shared-types/src/inputs.ts`, reused by create *and* update
  mutations instead of each router hand-rolling its own shape. This is the
  project's "FluentValidation equivalent" — lean on it for new fields/rules
  rather than redefining shapes per-router.
- `assertCompanyAccess` centralized in `apps/api/src/trpc/access.ts` — don't
  redefine it per-router again. `assertCanWrite`/`assertIsOrgAdmin` live
  alongside it (see RBAC below).
- Richer RBAC: per-company roles (owner/admin/accountant/bookkeeper/viewer)
  assignable via a "Equipe" panel on the dashboard (owner/admin only). Viewer
  is read-only everywhere.

## Known gaps / deliberately stubbed

- **DGI submission** (`packages/dgi-clearance`): always "accepted", fake
  reference. Blocked on Morocco's DGI publishing a real API — not something
  we can build ahead of. Swap point is the `DgiClearanceProvider` interface.
- **Email** (`packages/mailer`): `ResendMailProvider` now exists and is
  verified against Resend's real API (confirmed via a 401-on-fake-key smoke
  test — the HTTP call shape is correct). Selected via `MAIL_PROVIDER=resend`
  + `RESEND_API_KEY` + `MAIL_FROM` env vars in `apps/api/.env`; unset
  `MAIL_PROVIDER` (the default everywhere today, including prod `.env`) keeps
  `ConsoleMailProvider` (logs only). **Still needs**: a real Resend account +
  API key + verified sending domain before it actually delivers anything.
- **RBAC**: done. Clerk still only seeds owner/viewer on first sighting
  (`mapClerkOrgRole`), but the richer owner/admin/accountant/bookkeeper/viewer
  split is now assigned via our own UI (`StaffList` component, `membership`
  router) and **persists** — `context.ts` no longer clobbers a manually-set
  role back to the Clerk default on every request (it used to; fixed by only
  letting Clerk force `owner`, never anything else). `assertCanWrite` gates
  every mutation so `viewer` is read-only everywhere; `assertIsOrgAdmin`
  gates the staff panel itself (owner/admin only).
- **Mobile app**: real flow now — sign-in, org picker, company list, per-company
  invoice list, new-invoice form (client + product picker, multi-line, TVA
  rate), invoice detail with issue action. Verified with a real headless
  `expo export` bundle (1105 modules, no unresolved imports), not just
  typecheck. Missing `@babel/runtime` dependency (nothing in the workspace
  had ever declared it) was blocking the app from bundling at all — fixed by
  adding it to `apps/mobile/package.json`. Still missing: client/product
  create-in-app (currently manage those from the web dashboard), edit/delete
  from mobile, DGI submission trigger from mobile.
- **No CI/deploy pipeline**: `infra/` is empty.
- **RLS backstop**: `app_user` Postgres role created (grants applied,
  DELETE revoked on legally-retained tables) and `rls.sql` policies are
  live on the real DB — verified directly (app_user sees 0 rows with no
  `app.current_company_ids` set, exactly the right row once set). Zero
  effect on the running app so far since it still connects as the table
  owner (bypasses RLS). **Not yet cut over**: switching `DATABASE_URL` to
  `app_user` requires every Prisma call to run inside a per-request
  transaction that does `SET LOCAL app.current_company_ids` first — a real
  request-lifecycle change, not a config flip. Deliberately paused before
  that step: an incompletely-wired path wouldn't error, it'd silently
  return empty results in prod. App-layer scoping (`assertCompanyAccess`)
  remains the actual enforcement until this is finished.

## Environment / running locally

- `DATABASE_URL` / `DIRECT_URL` in `apps/api/.env` point at a real hosted
  Supabase Postgres — **not** a local DB. Migrations run against it directly.
  `packages/db` has no `.env` of its own; export the vars from
  `apps/api/.env` before running `prisma migrate dev` there, e.g.:
  `set -a && source apps/api/.env && set +a`
- `pnpm db:migrate` / `pnpm db:generate` — Prisma commands, run from repo root.
- `pnpm -r typecheck` — whole-monorepo typecheck, do this before every commit.
- `pnpm --filter web build` — catches things typecheck alone misses (Next.js
  build-time checks).
- `WEB_APP_URL` env var is what the API uses to build links it emails out
  (prospect onboarding links today).

## Working conventions established in this project

- Prefer editing/reusing existing forms in "edit mode" (`initial` prop) over
  separate edit components — see `CompanyForm`/`ClientForm`/`ProductForm`.
- `ConfirmDialog` (`apps/web/src/components/ui/ConfirmDialog.tsx`) is the
  reusable delete-confirmation pattern — use it, don't roll a new one.
- New external integrations (DGI, mail) go behind an interface + stub
  implementation in their own `packages/*` workspace package, so a real
  provider is a drop-in swap later, not a rewrite.
- GitHub push auth: use a PAT with `repo` scope or `gh auth login` — plain
  password auth is rejected by GitHub.

## Next candidate work (not started)

- Finish the RLS cutover: wrap request handling so `ctx.prisma` runs inside
  a per-request transaction with `SET LOCAL app.current_company_ids` set
  first, then switch `DATABASE_URL`/`DIRECT_URL` to `app_user`. Explicitly
  paused pending a deliberate go/no-go, not a "todo" — see the gaps section
  above for why.
- CI pipeline (`infra/` is empty).
- Real Resend account/API key/verified domain to actually send the mail
  that `ResendMailProvider` is already wired up to send.
