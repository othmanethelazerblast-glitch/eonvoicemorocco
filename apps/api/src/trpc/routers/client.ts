import { z } from "zod";
import { clientInput } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";
import { assertCanWrite, assertCompanyAccess } from "../access";
import { deleteOrFriendlyConflict } from "../errors";

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

  create: protectedProcedure.input(clientInput).mutation(({ ctx, input }) => {
    assertCanWrite(ctx);
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

  update: protectedProcedure
    .input(clientInput.omit({ companyId: true }).partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx);
      const existing = await ctx.prisma.client.findUniqueOrThrow({ where: { id: input.id } });
      assertCompanyAccess(ctx, existing.companyId);
      const { id, identifiers, address, ...rest } = input;
      return ctx.prisma.client.update({
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

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    assertCanWrite(ctx);
    const existing = await ctx.prisma.client.findUniqueOrThrow({ where: { id: input.id } });
    assertCompanyAccess(ctx, existing.companyId);
    return deleteOrFriendlyConflict(
      () => ctx.prisma.client.delete({ where: { id: input.id } }),
      "Impossible de supprimer un client qui a des factures.",
    );
  }),
});
