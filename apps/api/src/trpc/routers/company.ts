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

  create: protectedProcedure.input(createCompanyInput).mutation(({ ctx, input }) => {
    return ctx.prisma.company.create({
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
  }),
});
