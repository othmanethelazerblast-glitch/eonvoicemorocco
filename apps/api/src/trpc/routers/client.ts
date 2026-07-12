import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { partyIdentifiersSchema, addressSchema } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";

const createClientInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  email: z.string().email().optional(),
});

function assertCompanyAccess(ctx: { companyIds: string[] }, companyId: string) {
  if (!ctx.companyIds.includes(companyId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const clientRouter = router({
  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertCompanyAccess(ctx, input.companyId);
      return ctx.prisma.client.findMany({
        where: { companyId: input.companyId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure.input(createClientInput).mutation(({ ctx, input }) => {
    assertCompanyAccess(ctx, input.companyId);
    return ctx.prisma.client.create({
      data: {
        companyId: input.companyId,
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
        email: input.email,
      },
    });
  }),
});
