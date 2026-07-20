import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ConsoleMailProvider, ResendMailProvider, type MailProvider } from "@app/mailer";
import { companyInput, prospectInviteCreateInput, prospectSubmissionInput } from "@app/shared-types";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { generateInviteToken, hashInviteToken } from "../../tokens";

const INVITE_TTL_DAYS = 7;

function getMailProvider(): MailProvider {
  if (process.env.MAIL_PROVIDER === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!apiKey || !from) {
      throw new Error("MAIL_PROVIDER=resend requires RESEND_API_KEY and MAIL_FROM to be set");
    }
    return new ResendMailProvider(apiKey, from);
  }
  return new ConsoleMailProvider();
}

function buildOnboardingUrl(token: string): string {
  const base = process.env.WEB_APP_URL ?? "http://localhost:3000";
  return `${base}/onboarding/${token}`;
}

const prospectInviteSummarySelect = {
  id: true,
  email: true,
  contactName: true,
  status: true,
  submittedData: true,
  expiresAt: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
} as const;

export const prospectInviteRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.prospectInvite.findMany({
      where: { organizationId: ctx.organizationId },
      select: prospectInviteSummarySelect,
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure.input(prospectInviteCreateInput).mutation(async ({ ctx, input }) => {
    const organization = await ctx.prisma.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
    });

    const { token, tokenHash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await ctx.prisma.prospectInvite.create({
      data: {
        organizationId: ctx.organizationId,
        email: input.email,
        contactName: input.contactName,
        tokenHash,
        expiresAt,
        createdByUserId: ctx.userId,
      },
      select: prospectInviteSummarySelect,
    });

    const url = buildOnboardingUrl(token);
    await getMailProvider().send({
      to: input.email,
      subject: `${organization.name} vous invite a renseigner vos informations`,
      html: `<p>Bonjour${input.contactName ? ` ${input.contactName}` : ""},</p>
<p>${organization.name} vous invite a renseigner les informations de votre societe pour la facturation.</p>
<p><a href="${url}">${url}</a></p>
<p>Ce lien expire dans ${INVITE_TTL_DAYS} jours.</p>`,
      text: `${organization.name} vous invite a renseigner les informations de votre societe : ${url} (expire dans ${INVITE_TTL_DAYS} jours)`,
    });

    return invite;
  }),

  reject: protectedProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.prospectInvite.findUniqueOrThrow({ where: { id: input.id } });
      if (invite.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.prisma.prospectInvite.update({
        where: { id: input.id },
        data: { status: "rejected", reviewedAt: new Date() },
        select: prospectInviteSummarySelect,
      });
    }),

  approve: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const invite = await ctx.prisma.prospectInvite.findUniqueOrThrow({ where: { id: input.id } });
    if (invite.organizationId !== ctx.organizationId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    if (invite.status !== "submitted" || !invite.submittedData) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cette invitation n'a pas encore ete soumise." });
    }

    // Re-validate the stored draft against the current schema rather than
    // trusting the JSON blob as-is — guards against schema drift between
    // when it was submitted and when it's approved.
    const data = companyInput.parse(invite.submittedData);

    return ctx.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          organizationId: ctx.organizationId,
          name: data.name,
          ice: data.identifiers.ice,
          identifiantFiscal: data.identifiers.identifiantFiscal,
          registreCommerce: data.identifiers.registreCommerce,
          patente: data.identifiers.patente,
          addressLine1: data.address.line1,
          addressLine2: data.address.line2,
          city: data.address.city,
          postalCode: data.address.postalCode,
          country: data.address.country,
          defaultCurrency: data.defaultCurrency,
        },
      });
      await tx.companyAccess.create({
        data: { userId: ctx.userId, companyId: company.id },
      });
      await tx.prospectInvite.update({
        where: { id: invite.id },
        data: { status: "approved", reviewedAt: new Date(), approvedCompanyId: company.id },
      });
      return company;
    });
  }),

  // --- Public procedures: reachable by an unauthenticated prospect who only
  // has the token from their invite email. Never expose tokenHash or any
  // other invite beyond the one matching the supplied token. ---

  getByToken: publicProcedure.input(z.object({ token: z.string().min(1) })).query(async ({ ctx, input }) => {
    const invite = await ctx.prisma.prospectInvite.findUnique({
      where: { tokenHash: hashInviteToken(input.token) },
      include: { organization: { select: { name: true } } },
    });
    if (!invite) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invitation introuvable." });
    }
    if (invite.status !== "pending") {
      return { state: invite.status as "submitted" | "approved" | "rejected" } as const;
    }
    if (invite.expiresAt < new Date()) {
      return { state: "expired" } as const;
    }
    return {
      state: "pending" as const,
      organizationName: invite.organization.name,
      email: invite.email,
      contactName: invite.contactName,
    };
  }),

  submit: publicProcedure
    .input(prospectSubmissionInput.extend({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { token, ...data } = input;
      const invite = await ctx.prisma.prospectInvite.findUnique({
        where: { tokenHash: hashInviteToken(token) },
        include: { createdBy: { select: { email: true } }, organization: { select: { name: true } } },
      });
      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation introuvable." });
      }
      if (invite.status !== "pending" || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cette invitation n'est plus valide." });
      }

      await ctx.prisma.prospectInvite.update({
        where: { id: invite.id },
        data: { status: "submitted", submittedAt: new Date(), submittedData: data },
      });

      if (invite.createdBy.email) {
        await getMailProvider().send({
          to: invite.createdBy.email,
          subject: `${data.name} a complete son formulaire`,
          html: `<p>${data.name} (${invite.email}) a complete le formulaire d'inscription pour ${invite.organization.name}.</p><p>Verifiez et validez la fiche dans le tableau de bord.</p>`,
          text: `${data.name} (${invite.email}) a complete le formulaire d'inscription. Verifiez et validez la fiche dans le tableau de bord.`,
        });
      }

      return { ok: true as const };
    }),
});
