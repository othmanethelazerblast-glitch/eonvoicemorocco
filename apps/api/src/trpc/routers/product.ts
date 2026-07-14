import { z } from "zod";
import { productInput } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";
import { assertCompanyAccess } from "../access";

export const productRouter = router({
  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertCompanyAccess(ctx, input.companyId);
      return ctx.prisma.product.findMany({
        where: { companyId: input.companyId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure.input(productInput).mutation(({ ctx, input }) => {
    assertCompanyAccess(ctx, input.companyId);
    return ctx.prisma.product.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        unit: input.unit,
        defaultUnitPrice: input.defaultUnitPrice,
        tvaRate: input.tvaRate,
      },
    });
  }),

  update: protectedProcedure
    .input(productInput.omit({ companyId: true }).partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.product.findUniqueOrThrow({ where: { id: input.id } });
      assertCompanyAccess(ctx, existing.companyId);
      const { id, ...rest } = input;
      return ctx.prisma.product.update({ where: { id }, data: rest });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.product.findUniqueOrThrow({ where: { id: input.id } });
    assertCompanyAccess(ctx, existing.companyId);
    return ctx.prisma.product.delete({ where: { id: input.id } });
  }),
});
