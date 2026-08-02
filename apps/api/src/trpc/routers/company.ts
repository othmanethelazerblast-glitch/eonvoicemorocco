import { randomUUID } from "node:crypto";
import { z } from "zod";
import { companyInput } from "@app/shared-types";
import { companyScopedProcedure, protectedProcedure, router } from "../trpc";
import { assertCanWrite, assertCompanyAccess } from "../access";
import { deleteOrFriendlyConflict } from "../errors";

export const companyRouter = router({
  list: companyScopedProcedure.query(({ ctx }) => {
    return ctx.prisma.company.findMany({
      where: { organizationId: ctx.organizationId, id: { in: ctx.companyIds } },
    });
  }),

  /**
   * Generates the new company's id app-side (instead of letting Prisma's
   * @default(uuid()) pick it during the insert) so it can be passed as
   * withCompanyScope's extraCompanyIds — the companies RLS SELECT policy
   * also gates INSERT...RETURNING, so without this the create() call itself
   * fails even though the INSERT is otherwise permitted (see withCompanyScope
   * doc comment in context.ts, verified directly against app_user).
   *
   * Also grants the creator explicit CompanyAccess in the same transaction —
   * without it, a non-owner/admin org role (viewer, per mapClerkOrgRole)
   * would immediately 403 on every query for the company they just created,
   * since companyIds for non-owner/admin roles comes only from CompanyAccess.
   */
  create: protectedProcedure.input(companyInput).mutation(async ({ ctx, input }) => {
    assertCanWrite(ctx);
    const newCompanyId = randomUUID();
    return ctx.withCompanyScope(async (tx) => {
      const company = await tx.company.create({
        data: {
          id: newCompanyId,
          organizationId: ctx.organizationId,
          name: input.name,
          ice: input.identifiers.ice,
          identifiantFiscal: input.identifiers.identifiantFiscal,
          registreCommerce: input.identifiers.registreCommerce,
          patente: input.identifiers.patente,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2,
          city: input.address.city,
          postalCode: input.address.postalCode,
          country: input.address.country,
          defaultCurrency: input.defaultCurrency,
        },
      });
      await tx.companyAccess.create({
        data: { userId: ctx.userId, companyId: company.id },
      });
      return company;
    }, [newCompanyId]);
  }),

  update: companyScopedProcedure
    .input(companyInput.partial().extend({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertCanWrite(ctx);
      assertCompanyAccess(ctx, input.id);
      const { id, identifiers, address, ...rest } = input;
      return ctx.prisma.company.update({
        where: { id },
        data: {
          ...rest,
          ...(identifiers && {
            ice: identifiers.ice,
            identifiantFiscal: identifiers.identifiantFiscal,
            registreCommerce: identifiers.registreCommerce,
            patente: identifiers.patente,
          }),
          ...(address && {
            addressLine1: address.line1,
            addressLine2: address.line2,
            city: address.city,
            postalCode: address.postalCode,
            country: address.country,
          }),
        },
      });
    }),

  delete: companyScopedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => {
    assertCanWrite(ctx);
    assertCompanyAccess(ctx, input.id);
    return deleteOrFriendlyConflict(
      () => ctx.prisma.company.delete({ where: { id: input.id } }),
      "Impossible de supprimer une societe qui a des factures.",
    );
  }),
});
