import { z } from "zod";
import { partyIdentifiersSchema, addressSchema, currencySchema } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";

const createCompanyInput = z.object({
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  defaultCurrency: currencySchema,
});

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
  create: protectedProcedure.input(createCompanyInput).mutation(async ({ ctx, input }) => {
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
});
