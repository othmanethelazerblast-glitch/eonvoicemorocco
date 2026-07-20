import { TRPCError } from "@trpc/server";
import type { OrgRole } from "@app/db";

/** Every router must call this before reading or writing anything scoped to
 * a companyId — it's the app-layer half of the tenant boundary (see the
 * companyIds doc comment in context.ts for the RLS backstop status). */
export function assertCompanyAccess(ctx: { companyIds: string[] }, companyId: string) {
  if (!ctx.companyIds.includes(companyId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

/** `viewer` is the one role that's read-only everywhere — call this at the
 * top of every mutation that isn't itself a role/access-management action. */
export function assertCanWrite(ctx: { role: OrgRole | null }) {
  if (ctx.role === "viewer") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acces en lecture seule." });
  }
}

/** Owner/admin only — role and company-access management. */
export function assertIsOrgAdmin(ctx: { role: OrgRole | null }) {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
