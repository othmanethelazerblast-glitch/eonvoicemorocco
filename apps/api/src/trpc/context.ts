import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma, type OrgRole } from "@app/db";

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
 * `companyIds` is the set of company IDs the authenticated user may act on
 * within the currently-selected organization — computed from Membership
 * (owner/admin => all companies in the org) and CompanyAccess (everyone
 * else). Routers check membership in this array before touching a company's
 * data (application-layer scoping). The RLS policies in
 * packages/db/prisma/rls.sql are a *backstop* for this, keyed off a
 * `SET LOCAL app.current_company_ids` session variable — but they only bite
 * once the app connects as a dedicated non-owner `app_user` role (Postgres
 * table owners bypass RLS by default), which is Phase 6 hardening work, not
 * yet wired in.
 */
export async function createContext({ req }: CreateFastifyContextOptions) {
  const auth = await resolveAuthContext(req.headers.authorization);
  return { prisma, ...auth };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
