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

## What's built (as of 2026-07-14/15)

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
  redefine it per-router again.

## Known gaps / deliberately stubbed

- **DGI submission** (`packages/dgi-clearance`): always "accepted", fake
  reference. Blocked on Morocco's DGI publishing a real API — not something
  we can build ahead of. Swap point is the `DgiClearanceProvider` interface.
- **Email** (`packages/mailer`): `ConsoleMailProvider` just logs. Swap point
  is the `MailProvider` interface — pick Resend/SES when ready to actually
  send mail.
- **RBAC is coarse**: Clerk roles collapse to just owner/viewer in
  `apps/api/src/trpc/context.ts` (`mapClerkOrgRole`), even though the DB
  schema already has the richer `OrgRole` enum (owner/admin/accountant/
  bookkeeper/viewer) ready to go. This is the natural next piece if selling
  to firms with multiple staff who need different access per client.
- **Mobile app**: one screen, no real CRUD yet.
- **No CI/deploy pipeline**: `infra/` is empty.
- **RLS backstop** (`packages/db/prisma/rls.sql`) isn't wired in yet — needs
  a dedicated non-owner `app_user` Postgres role (table owners bypass RLS by
  default). App-layer scoping (`assertCompanyAccess`) is the only
  enforcement today.

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

- Richer RBAC (per-company role beyond owner/viewer) — schema is ready,
  needs the Clerk role-mapping + UI to assign roles.
- Real mail provider swap-in once one is chosen.
- CI pipeline.
