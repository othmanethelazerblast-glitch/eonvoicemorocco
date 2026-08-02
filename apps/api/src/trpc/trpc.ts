import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Fails closed: no session, no organization context, no access. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });
});

/**
 * For routers whose every procedure only ever touches RLS-protected tables
 * (see packages/db/prisma/rls.sql) with no external I/O in between DB calls —
 * swaps `ctx.prisma` for a transaction client scoped to the caller's
 * `companyIds` via `SET LOCAL app.current_company_ids`, so resolver bodies
 * don't need to change at all. Routers that mix RLS-table access with
 * external calls (mail, Clerk, DGI) or non-RLS tables should call
 * `ctx.withCompanyScope` directly around just the DB-only segments instead —
 * see its doc comment in context.ts for why a blanket per-request wrap isn't
 * safe there.
 */
export const companyScopedProcedure = protectedProcedure.use(({ ctx, next }) => {
  return ctx.withCompanyScope(async (tx) => next({ ctx: { ...ctx, prisma: tx } }));
});
