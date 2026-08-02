import { z } from "zod";
import { productInput } from "@app/shared-types";
import { companyScopedProcedure, router } from "../trpc";
import { assertCanWrite, assertCompanyAccess } from "../access";

export const productRouter = router({
  listByCompany: companyScopedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertCompanyAccess(ctx, input.companyId);
      return ctx.prisma.product.findMany({
        where: { companyId: input.companyId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: companyScopedProcedure.input(productInput).mutation(({ ctx, input }) => {
    assertCanWrite(ctx);
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

  update: companyScopedProcedure
    .input(productInput.omit({ companyId: true }).partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx);
      const existing = await ctx.prisma.product.findUniqueOrThrow({ where: { id: input.id } });
      assertCompanyAccess(ctx, existing.companyId);
      const { id, ...rest } = input;
      return ctx.prisma.product.update({ where: { id }, data: rest });
    }),

  delete: companyScopedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    assertCanWrite(ctx);
    const existing = await ctx.prisma.product.findUniqueOrThrow({ where: { id: input.id } });
    assertCompanyAccess(ctx, existing.companyId);
    return ctx.prisma.product.delete({ where: { id: input.id } });
  }),
});
