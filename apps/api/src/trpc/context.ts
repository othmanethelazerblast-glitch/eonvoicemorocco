import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma, type OrgRole, type Prisma } from "@app/db";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface ClerkSessionClaims {
  sub: string;
  /** Modern (v2) compact org claim. */
  o?: { id?: string; rol?: string };
  /** Older/manual JWT template shape — checked as a fallback. */
  org_id?: string;
  org_role?: string;
}

function mapClerkOrgRole(clerkRole: string | undefined): OrgRole {
  // Clerk only distinguishes "org:admin" vs "org:member". That's just the
  // seed value for a brand-new membership (and a standing override for
  // org:admin, see resolveAuthContext below) — the richer
  // admin/accountant/bookkeeper/viewer split for org:member users is owned
  // by our own RBAC UI (membership.setRole), not by Clerk.
  return clerkRole === "org:admin" ? "owner" : "viewer";
}

/**
 * The session token's org-role claim shape is not reliable across Clerk
 * versions/configs (confirmed: `o.id` resolves correctly but `o.rol`/
 * `org_role` do not carry the value the dashboard shows), so the role is
 * fetched directly from Clerk's API instead of trusted from the JWT. Costs
 * one extra API call per first-sighting-of-org-context request; fine at MVP
 * volume, worth caching later.
 */
async function fetchClerkOrgRole(clerkUserId: string, clerkOrgId: string): Promise<string | undefined> {
  const { data } = await clerkClient.users.getOrganizationMembershipList({ userId: clerkUserId });
  return data.find((m) => m.organization.id === clerkOrgId)?.role;
}

interface AuthContext {
  userId: string | null;
  organizationId: string | null;
  companyIds: string[];
  role: OrgRole | null;
}

async function resolveAuthContext(authHeader: string | undefined): Promise<AuthContext> {
  const empty: AuthContext = { userId: null, organizationId: null, companyIds: [], role: null };

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token || !process.env.CLERK_SECRET_KEY) {
    return empty;
  }

  let claims: ClerkSessionClaims;
  try {
    claims = (await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })) as ClerkSessionClaims;
  } catch {
    return empty;
  }

  const clerkUserId = claims.sub;
  const clerkOrgId = claims.o?.id ?? claims.org_id;

  // Upsert the local User row on first sighting of this Clerk user.
  let user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";
    user = await prisma.user.create({ data: { clerkUserId, email } });
  }

  if (!clerkOrgId) {
    // Signed in but no active organization selected/created yet.
    return { userId: user.id, organizationId: null, companyIds: [], role: null };
  }

  // Upsert the local Organization row on first sighting of this Clerk org.
  let organization = await prisma.organization.findUnique({ where: { clerkOrgId } });
  if (!organization) {
    const clerkOrg = await clerkClient.organizations.getOrganization({ organizationId: clerkOrgId });
    organization = await prisma.organization.create({ data: { clerkOrgId, name: clerkOrg.name } });
  }

  const clerkOrgRole = await fetchClerkOrgRole(clerkUserId, clerkOrgId);
  const defaultRole = mapClerkOrgRole(clerkOrgRole);

  // First sighting: seed from Clerk's admin/member split. After that, the
  // richer accountant/bookkeeper/viewer/admin split is owned by our own RBAC
  // UI (membership.setRole) and must not be clobbered on every request — the
  // one exception is Clerk org:admin, which always forces "owner" so an org
  // admin can never be locked out by a stale local role row.
  const existing = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
  });
  const role: OrgRole =
    !existing ? defaultRole : defaultRole === "owner" ? "owner" : existing.role;

  if (!existing || existing.role !== role) {
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      create: { organizationId: organization.id, userId: user.id, role },
      update: { role },
    });
  }

  const companyIds =
    role === "owner" || role === "admin"
      ? (
          await prisma.company.findMany({
            where: { organizationId: organization.id },
            select: { id: true },
          })
        ).map((c) => c.id)
      : (
          await prisma.companyAccess.findMany({
            where: { userId: user.id, company: { organizationId: organization.id } },
            select: { companyId: true },
          })
        ).map((c) => c.companyId);

  return { userId: user.id, organizationId: organization.id, companyIds, role };
}

/**
 * Opens a short-lived interactive transaction, sets `app.current_company_ids`
 * for it via `SET LOCAL` (through the `set_config` function so the value is
 * bind-parameterized, never string-interpolated into SQL), and runs `fn`
 * against that transaction's client. This is what makes the RLS policies in
 * packages/db/prisma/rls.sql actually bite once the app connects as the
 * non-owner `app_user` role (table owners bypass RLS entirely) — table owner
 * `postgres`/direct connections ignore this and always see everything.
 *
 * Deliberately scoped narrowly around DB-only work, not wrapped around an
 * entire request: Prisma's interactive transactions default to a 5s timeout
 * and hold a pooled connection for their whole duration, and some mutations
 * (DGI submission polling, outbound mail, Clerk API calls) take far longer
 * than that. Callers doing both DB and external I/O in one procedure must
 * call this once per DB-only segment, with the external calls outside it.
 *
 * `extraCompanyIds` covers the one case where a row's own id must be visible
 * to itself before it exists in `companyIds` — creating a *new* Company.
 * `companies` RLS policies allow the INSERT unconditionally (see rls.sql),
 * but Prisma's `create()` always does `INSERT ... RETURNING`, and RETURNING
 * is gated by the table's SELECT policy just like a normal read — so without
 * pre-including the (client-generated) new id here, `.create()` would fail
 * with "new row violates row-level security policy" despite the insert
 * itself being allowed. Verified directly against app_user on the real DB.
 */
function withCompanyScope(companyIds: string[]) {
  return async function runInCompanyScope<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    extraCompanyIds: string[] = [],
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const ids = [...companyIds, ...extraCompanyIds].join(",");
      await tx.$executeRaw`SELECT set_config('app.current_company_ids', ${ids}, true)`;
      return fn(tx);
    });
  };
}

/**
 * `companyIds` is the set of company IDs the authenticated user may act on
 * within the currently-selected organization — computed from Membership
 * (owner/admin => all companies in the org) and CompanyAccess (everyone
 * else). Routers check membership in this array before touching a company's
 * data (application-layer scoping). `withCompanyScope` (attached below as
 * `ctx.withCompanyScope`) is the RLS backstop for this — see its doc comment
 * for why it's a per-segment helper rather than a blanket per-request wrap.
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  const auth = await resolveAuthContext(req.headers.authorization);
  return { prisma, ...auth, withCompanyScope: withCompanyScope(auth.companyIds) };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
