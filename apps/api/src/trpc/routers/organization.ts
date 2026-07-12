import { protectedProcedure, router } from "../trpc";

export const organizationRouter = router({
  current: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: { companies: true },
    });
  }),
});
