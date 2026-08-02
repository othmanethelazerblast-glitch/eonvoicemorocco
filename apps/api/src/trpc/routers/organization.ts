import { companyScopedProcedure, router } from "../trpc";

export const organizationRouter = router({
  current: companyScopedProcedure.query(({ ctx }) => {
    return ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: { companies: true },
    });
  }),
});
