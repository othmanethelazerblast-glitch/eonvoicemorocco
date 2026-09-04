# Scratchpad

Running notes on where this project stands, so picking it back up doesn't mean
re-deriving context from scratch. Update this when you finish a chunk of work;
prune stale entries rather than letting it grow forever.

## Session in progress (2026-09-04) — pick up here next time

Mid-deploy setup, stopped partway through. Exact state:

- **Vercel (`apps/web`)**: project created, 5 env vars added in its
  dashboard (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
  `DATABASE_URL`/`DIRECT_URL` as CI-style dummy values — only
  `prisma generate` needs these *defined*, not reachable —
  `NEXT_PUBLIC_API_URL` as a localhost placeholder). Told the user to also
  override **Install Command** to
  `cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate` (Root
  Directory is already `apps/web`) and redeploy — **not yet confirmed
  whether that was done or whether the redeploy passed**. If picking this
  back up: ask for the latest deploy log tail first.
- **Northflank (`apps/api`)**: fully decided (see "Next candidate work"
  below for the why), but **account not created yet, nothing configured**.
  Exact steps already given to the user: sign up free, new service from
  the GitHub repo, Root Directory `apps/api`, Build Command
  `cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter api build`,
  Start Command `pnpm --filter api start`, Port `4000` (reads
  `API_PORT` env var if set, defaults to 4000). Env vars needed there are
  the **real** values from `apps/api/.env` (unlike Vercel's dummy
  DB values, Northflank's API process actually connects) — DATABASE_URL,
  DIRECT_URL, CLERK_SECRET_KEY, EFACT_SECRET_KEY,
  DGI_CLEARANCE_PROVIDER=efact, MAIL_PROVIDER/RESEND_API_KEY/MAIL_FROM if
  set, WEB_APP_URL (should point at the Vercel URL once known), API_PORT.
- **Once Northflank gives a live URL**: update `NEXT_PUBLIC_API_URL` in
  Vercel's env vars to that real URL (currently still the localhost
  placeholder) and redeploy web again.

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

- **DGI submission** (`packages/dgi-clearance`): DGI's own direct API still
  doesn't exist, but `EfactClearanceProvider` now integrates with efact.ma —
  a real third-party clearance middleware whose sandbox runs invoices
  through an actual UBL 2.1 + XAdES signing pipeline (only the final DGI
  callback is simulated on their end). **Verified fully end-to-end** on
  2026-07-20: a real test invoice went through `api.efact.ma` and came back
  `ACCEPTED` with a (mock) `dgiReference`, QR payload, and timestamps —
  our polling logic (SIGNED -> TRANSMITTED -> ACCEPTED, ~7s) and result
  mapping both work against the live sandbox, not just typecheck. Getting
  here needed two account-side steps on efact's dashboard (not our code):
  an `EFACT_SECRET_KEY` (no self-serve signup shown in their docs — got one
  directly from them) and a signing certificate uploaded per-organization
  (their API returns `422 SIGNATURE_CERTIFICATE_MISSING` without one). The
  real cert path is a **Barid eSign Class 3 qualified certificate**
  (Morocco's only state-approved CA, Law 43-20 — online.baridesign.ma,
  requires in-person pickup); for sandbox testing a self-signed PKCS#12
  works fine instead (generated locally via `openssl req -x509 ...` +
  `openssl pkcs12 -export`, uploaded through efact's dashboard) — that's
  what's actually configured right now, **not** a real qualified cert, so
  this is sandbox-only and not a path to production submissions as-is.
  Gated per-company: only fires when a company's `clearanceMode` is `"live"`
  *and* `DGI_CLEARANCE_PROVIDER=efact` + `EFACT_SECRET_KEY` are set (both
  set in `apps/api/.env` now) — every company defaulting to
  `clearanceMode: stubbed` is completely unaffected. **Still needs**: a real
  `paymentMethod` field on `Invoice` (currently hardcoded `"BANK_TRANSFER"`
  since we don't collect it — fine for sandbox, not for real submissions),
  and eventually a real Barid eSign cert once actually going to production.
  efact is middleware, not DGI itself, and not yet an accredited CSP (DGI
  hasn't published that accreditation process) — the `DgiClearanceProvider`
  interface is what keeps switching to DGI directly, or another CSP, a new
  provider class instead of a rewrite.
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
- **UI/UX design debt (flagged 2026-07-20, fix deferred)**: user is bringing
  in Figma/Claude design work separately to address this properly — don't
  redesign ahead of that, just tracking so it's not lost. Landing page and
  general layout feel unpolished; most pages (`dashboard`, header) are
  `max-w-5xl mx-auto` — centered, not using available width well, worth
  reconsidering once real design direction exists. Client/Company/Product
  management UX (flat lists with edit/delete icons) may not hold up once an
  org has many clients — needs real UX thinking for scale (search/filter,
  pagination, bulk actions?), not just more of the same pattern. One actual
  bug already fixed: Clerk widgets (`OrganizationSwitcher`/`UserButton`)
  had no `appearance` config, so they stayed light-themed while the rest of
  the app follows OS dark mode (Tailwind `media` strategy) — unreadable
  dark-on-dark in dark mode. Fixed in `apps/web/src/app/providers.tsx` via
  `@clerk/themes`' `dark` theme, toggled by a `matchMedia` listener that
  mirrors the same `prefers-color-scheme` signal Tailwind uses.
- **CI**: `.github/workflows/ci.yml` — `typecheck` job (install, `prisma
  generate` against a dummy `DATABASE_URL` — generate never needs a real
  connection, only migrate/studio do — then `pnpm -r typecheck`) is the real
  merge gate and needs zero secrets. A second `build` job runs `api`/`web`
  builds and needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` /
  `NEXT_PUBLIC_API_URL` as GitHub Actions secrets — **set 2026-08-02**
  (Clerk keys pulled from `apps/api/.env` / `apps/mobile/.env`;
  `NEXT_PUBLIC_API_URL` is a `http://localhost:4000` placeholder since
  nothing's deployed yet — update it once a real API URL exists). Not yet
  confirmed green end-to-end since the workflow only triggers on
  push/pull_request (no `workflow_dispatch`). **Confirmed green**
  end-to-end as of 2026-09-04 (the 2026-08-02 RLS-cutover push passed,
  2m49s). **No deploy step yet** — `infra/` is still empty.
- **RLS backstop**: cut over and live (2026-08-02). `apps/api/.env`
  `DATABASE_URL` now connects as `app_user` (RLS-enforced); `DIRECT_URL`
  deliberately stays on the table-owner (`postgres`) connection — it's what
  Prisma migrations use for DDL, and `app_user` has no schema-modification
  grants, only DML. Every Prisma call that touches an RLS-protected table
  (companies, clients, products, invoices, invoice_lines, invoice_documents,
  invoice_status_history, dgi_submissions) now goes through
  `ctx.withCompanyScope` (`apps/api/src/trpc/context.ts`), which opens a
  short interactive transaction and does `SELECT set_config('app.current_company_ids', ..., true)`
  before running the query — this is what actually makes the `rls.sql`
  policies bite (table owners bypass RLS entirely; app_user does not).
  Two procedure patterns: `companyScopedProcedure` (`apps/api/src/trpc/trpc.ts`)
  for routers where every procedure only touches RLS tables with no
  external I/O in between (`client.ts`, `product.ts`, `company.ts`,
  `organization.ts` — swaps `ctx.prisma` transparently via middleware, no
  resolver body changes needed); `ctx.withCompanyScope(fn)` called directly
  for routers that mix RLS-table access with non-RLS tables or external
  calls (`membership.ts`, `prospectInvite.ts`'s `approve`, all of
  `invoice.ts`). Deliberately **not** one transaction per request — Prisma's
  interactive transactions default to a 5s timeout and hold a pooled
  connection for their duration, and `invoice.submit`'s DGI polling alone
  takes ~7s against efact.ma's sandbox — so `invoice.ts`'s mutations split
  into separate scoped blocks around each external call (DGI submit, PDF/UBL
  storage upload), never holding a transaction open across one.
  One real bug caught and fixed along the way: `companies`' original single
  RLS policy defaulted `WITH CHECK` to the same scoped `USING` expression,
  which made company creation impossible — a brand-new row's own id can
  never already be in `current_company_ids` (it doesn't exist yet). Fixed
  by splitting into separate per-command policies with `company_insert`
  permissive (`WITH CHECK (true)`; creation auth is already fully enforced
  app-side via `assertCanWrite` + a server-derived `organizationId`, RLS's
  job there is only to gate reads/writes of *existing* companies). Even
  with that fix, `INSERT ... RETURNING` (which Prisma's `.create()` always
  uses) is *also* gated by the SELECT policy — so `company.create` and
  `prospectInvite.approve` generate the new company's id app-side
  (`randomUUID()`, not Prisma's `@default(uuid())`) and pass it as
  `withCompanyScope`'s `extraCompanyIds` so the row is visible to itself
  within that same transaction. Child tables (clients, products, invoices,
  ...) don't have this problem — their policies key off an existing
  `companyId` FK, not their own PK. All of this was verified twice: once
  with raw SQL directly against `app_user` on the live DB (fail-closed with
  no context, correct isolation with/without matching scope, the INSERT/
  RETURNING failure and fix), and once through the actual Prisma-mediated
  code path (a throwaway script exercising `withCompanyScope` exactly as
  the routers do — company create, scoped read, cross-scope isolation,
  client create, nested invoice+lines create — all passed before cutover).
  App-layer scoping (`assertCompanyAccess`) is unchanged and remains the
  primary enforcement; RLS is the backstop it always was meant to be.
  The pre-cutover `.env.bak-before-rls-cutover` rollback file was deleted
  2026-09-04 after a month of stable running.

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

- **Deploy decision made (2026-09-04): Vercel for `apps/web`, Northflank for
  `apps/api`.** Web is stock Next.js (`next build`/`next start`) — Vercel's
  the native fit, free Hobby tier (non-commercial only per ToS — expect
  Pro, ~$20/mo, once there are real paying clients). API is a long-running
  Fastify process (`fastify.listen`), not serverless-shaped, so it needs a
  plain always-on Node-service host rather than Vercel functions.
  Originally picked Railway for that reason, then Render (free, but sleeps
  after 15min idle — cold starts), then switched to **Northflank**: also
  free forever ("Sandbox" tier) but genuinely **always-on with no
  sleep/cold-start**, deploys straight from GitHub, 2 free services + 1
  free database — better fit than Render at the same $0 cost. Caveat
  accepted knowingly: Northflank is a smaller/newer platform than
  Render/Railway, worth watching in case free-tier terms shift later (as
  just happened to Koyeb, acquired by Mistral AI in 2026 and closed to new
  free signups). Postgres stays on Supabase either way — neither platform
  needs to provision a DB, just env vars. `infra/` is still empty —
  blocked on real accounts on both platforms (needs the user to create
  them + connect the GitHub repo + set env vars in each dashboard). Once
  accounts exist: Vercel needs Root Directory = `apps/web` (monorepo
  pnpm/turbo autodetected — see the build gotcha note above: Install
  Command must be overridden to
  `cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate`) + the
  same Clerk/API env vars already used in CI's build job (done 2026-09-04);
  Northflank needs Root Directory = `apps/api` + the same
  install-then-generate step + `apps/api/.env`'s vars (DATABASE_URL,
  DIRECT_URL, Clerk secret, EFACT_SECRET_KEY, MAIL_PROVIDER, etc.) entered
  in its dashboard, plus a Start Command of `pnpm --filter api start`
  (after `pnpm --filter api build`). `NEXT_PUBLIC_API_URL` (currently a
  localhost placeholder in Vercel/CI) needs updating to the real Northflank
  API URL once that's live.
  **Vercel build gotcha hit 2026-09-04**: `apps/web` → `@app/api-client` →
  `@app/api` → `@app/db` is a real dependency chain (tRPC needs `apps/api`'s
  router type for end-to-end type safety), so Turbo correctly builds that
  whole chain even though Root Directory is `apps/web` — this is not a
  mis-scoping bug. It broke because Vercel's default Install Command
  doesn't run `pnpm db:generate` first (CI always does, with a dummy
  `DATABASE_URL` — generate never connects to a real DB, only `migrate`
  does), so `@app/db`'s generated enum exports didn't exist yet. Fixed by
  overriding Vercel's **Install Command** to
  `cd ../.. && pnpm install --frozen-lockfile && pnpm db:generate`, plus
  setting dummy `DATABASE_URL`/`DIRECT_URL` and real
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`/
  `NEXT_PUBLIC_API_URL` as Vercel env vars (same set CI's build job uses).
- Real Resend account/API key/verified domain to actually send the mail
  that `ResendMailProvider` is already wired up to send.

## Resolved (2026-09-04)

- `gh`/git auth was dead (401 on API calls, push failing). Two
  fine-grained PATs pasted into chat both hit `403 Resource not accessible
  by personal access token` — Contents permission wasn't actually granted
  despite attempts to fix it in the GitHub UI. Switched to `gh auth login`
  browser OAuth flow instead (`repo`+`workflow` scopes), which fixed it
  cleanly — no token ever needs to touch a chat session again for this.
  All three exposed tokens (the original broad classic PAT from
  2026-08-02, plus the two fine-grained ones from today) have been
  revoked/deleted.
