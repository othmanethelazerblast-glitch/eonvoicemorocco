import { z } from "zod";
import { companyInput } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";
import { assertCompanyAccess } from "../access";
import { deleteOrFriendlyConflict } from "../errors";

export const companyRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.company.findMany({
      where: { organizationId: ctx.organizationId, id: { in: ctx.companyIds } },
    });
  }),

  /**
   * Grants the creator explicit CompanyAccess in the same transaction —
   * without it, a non-owner/admin org role (viewer, per mapClerkOrgRole)
   * would immediately 403 on every query for the company they just created,
   * since companyIds for non-owner/admin roles comes only from CompanyAccess.
   */
  create: protectedProcedure.input(companyInput).mutation(async ({ ctx, input }) => {
    return ctx.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
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
    });
  }),

  update: protectedProcedure
    .input(companyInput.partial().extend({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
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

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => {
    assertCompanyAccess(ctx, input.id);
    return deleteOrFriendlyConflict(
      () => ctx.prisma.company.delete({ where: { id: input.id } }),
      "Impossible de supprimer une societe qui a des factures.",
    );
  }),
});
