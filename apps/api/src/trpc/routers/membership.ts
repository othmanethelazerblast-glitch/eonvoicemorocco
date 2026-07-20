import { createClerkClient } from "@clerk/backend";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { assertIsOrgAdmin } from "../access";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const ASSIGNABLE_ROLES = ["admin", "accountant", "bookkeeper", "viewer"] as const;

export const membershipRouter = router({
  /**
   * Merges Clerk's org membership list (identity: name/email/avatar) with our
   * own Membership.role and CompanyAccess grants — Clerk only knows
   * admin/member, the richer role and per-company scoping live in our DB.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    assertIsOrgAdmin(ctx);

    const organization = await ctx.prisma.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
    });

    const [clerkMembers, localMemberships, companies, accessGrants] = await Promise.all([
      clerkClient.organizations.getOrganizationMembershipList({
        organizationId: organization.clerkOrgId,
      }),
      ctx.prisma.membership.findMany({
        where: { organizationId: ctx.organizationId },
        include: { user: { select: { id: true, clerkUserId: true, email: true } } },
      }),
      ctx.prisma.company.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, name: true },
      }),
      ctx.prisma.companyAccess.findMany({
        where: { company: { organizationId: ctx.organizationId } },
        select: { userId: true, companyId: true },
      }),
    ]);

    const membershipByClerkUserId = new Map(localMemberships.map((m) => [m.user.clerkUserId, m]));

    const members = clerkMembers.data
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => Boolean(id))
      .map((clerkUserId) => {
        const local = membershipByClerkUserId.get(clerkUserId);
        const clerkMember = clerkMembers.data.find((m) => m.publicUserData?.userId === clerkUserId);
        return {
          userId: local?.user.id ?? null,
          clerkUserId,
          email: local?.user.email ?? clerkMember?.publicUserData?.identifier ?? "",
          role: local?.role ?? null,
          companyIds: local
            ? accessGrants.filter((g) => g.userId === local.user.id).map((g) => g.companyId)
            : [],
        };
      });

    return { members, companies };
  }),

  setRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(ASSIGNABLE_ROLES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertIsOrgAdmin(ctx);
      const membership = await ctx.prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: ctx.organizationId!, userId: input.userId } },
      });
      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ce membre n'appartient pas a cette organisation." });
      }
      await ctx.prisma.membership.update({
        where: { id: membership.id },
        data: { role: input.role },
      });
      return { ok: true as const };
    }),

  setCompanyAccess: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        companyId: z.string().uuid(),
        grant: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertIsOrgAdmin(ctx);
      const company = await ctx.prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
      if (company.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (input.grant) {
        await ctx.prisma.companyAccess.upsert({
          where: { userId_companyId: { userId: input.userId, companyId: input.companyId } },
          create: { userId: input.userId, companyId: input.companyId },
          update: {},
        });
      } else {
        await ctx.prisma.companyAccess.deleteMany({
          where: { userId: input.userId, companyId: input.companyId },
        });
      }
      return { ok: true as const };
    }),
});
