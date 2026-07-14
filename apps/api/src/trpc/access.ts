import { TRPCError } from "@trpc/server";

/** Every router must call this before reading or writing anything scoped to
 * a companyId — it's the app-layer half of the tenant boundary (see the
 * companyIds doc comment in context.ts for the RLS backstop status). */
export function assertCompanyAccess(ctx: { companyIds: string[] }, companyId: string) {
  if (!ctx.companyIds.includes(companyId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
