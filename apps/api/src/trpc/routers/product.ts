import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { TVA_RATES } from "@app/shared-types";
import { protectedProcedure, router } from "../trpc";

const tvaRateInput = z.number().refine((v) => (TVA_RATES as readonly number[]).includes(v), {
  message: "Taux de TVA invalide",
});

const createProductInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  unit: z.string().default("unite"),
  defaultUnitPrice: z.number().nonnegative(),
  tvaRate: tvaRateInput,
});

function assertCompanyAccess(ctx: { companyIds: string[] }, companyId: string) {
  if (!ctx.companyIds.includes(companyId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

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

  create: protectedProcedure.input(createProductInput).mutation(({ ctx, input }) => {
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
});
