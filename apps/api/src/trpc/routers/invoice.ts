import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ClearanceMode, Prisma } from "@app/db";
import { StubClearanceProvider, type DgiClearanceProvider } from "@app/dgi-clearance";
import { generateInvoicePdf } from "@app/pdf-generator";
import type { UblInvoiceInput } from "@app/shared-types";
import { generateUblInvoiceXml } from "@app/ubl-generator";
import { protectedProcedure, router } from "../trpc";
import { assertCanWrite, assertCompanyAccess } from "../access";
import { uploadInvoiceDocument } from "../../storage";

const createInvoiceInput = z.object({
  companyId: z.string().uuid(),
  clientId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        tvaRate: z.number().min(0).max(1),
      }),
    )
    .min(1),
});

interface PartyRow {
  name: string;
  ice: string | null;
  identifiantFiscal: string | null;
  registreCommerce: string | null;
  patente: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string | null;
  country: string;
}

function toPartyPayload(entity: PartyRow) {
  return {
    name: entity.name,
    address: {
      line1: entity.addressLine1,
      line2: entity.addressLine2 ?? undefined,
      city: entity.city,
      postalCode: entity.postalCode ?? undefined,
      country: entity.country,
    },
    identifiers: {
      ice: entity.ice ?? undefined,
      identifiantFiscal: entity.identifiantFiscal ?? undefined,
      registreCommerce: entity.registreCommerce ?? undefined,
      patente: entity.patente ?? undefined,
    },
  };
}

/**
 * "none" means the company opted out of clearance entirely — nothing to
 * submit. "stubbed" and "live" both resolve to the stub today because DGI
 * has not published a real API to integrate against yet (see
 * packages/dgi-clearance); once it does, "live" is the branch that picks an
 * XhubClearanceProvider instead.
 */
function getClearanceProvider(clearanceMode: ClearanceMode): DgiClearanceProvider {
  if (clearanceMode === "none") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La clairance DGI n'est pas activee pour cette societe.",
    });
  }
  return new StubClearanceProvider();
}

function computeTotals(lines: { quantity: number; unitPrice: number; tvaRate: number }[]) {
  return lines.reduce(
    (acc, line) => {
      const lineExclTax = line.quantity * line.unitPrice;
      const lineTax = lineExclTax * line.tvaRate;
      acc.totalExclTax += lineExclTax;
      acc.totalTax += lineTax;
      acc.totalInclTax += lineExclTax + lineTax;
      return acc;
    },
    { totalExclTax: 0, totalTax: 0, totalInclTax: 0 },
  );
}

/**
 * DGI submission (Phase 3) is intentionally out of scope here — this only
 * takes a draft invoice through the pre-clearance lifecycle: draft -> issued,
 * with sequential per-company numbering and a hash chain so the data can't be
 * silently rewritten later. Every transition is recorded in
 * InvoiceStatusHistory (append-only, never updated/deleted).
 */
export const invoiceRouter = router({
  listByCompany: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertCompanyAccess(ctx, input.companyId);
      return ctx.prisma.invoice.findMany({
        where: { companyId: input.companyId },
        include: {
          lines: true,
          client: { select: { name: true } },
          dgiSubmissions: { orderBy: { createdAt: "desc" }, take: 1 },
          correctsInvoice: { select: { invoiceNumber: true } },
          correctedByInvoices: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: {
          lines: true,
          client: true,
          company: { select: { name: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
          // requestPayload/responsePayload aren't rendered anywhere and
          // Prisma's recursive Json type blows up TS's instantiation depth
          // when this shape flows into JSX — select only what the UI uses.
          dgiSubmissions: {
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, errorDetail: true, createdAt: true },
          },
          documents: { orderBy: { createdAt: "desc" } },
          correctsInvoice: { select: { id: true, invoiceNumber: true } },
          correctedByInvoices: { select: { id: true, invoiceNumber: true, status: true } },
        },
      });
      assertCompanyAccess(ctx, invoice.companyId);
      return invoice;
    }),

  createDraft: protectedProcedure.input(createInvoiceInput).mutation(async ({ ctx, input }) => {
    assertCanWrite(ctx);
    assertCompanyAccess(ctx, input.companyId);
    const totals = computeTotals(input.lines);

    return ctx.prisma.invoice.create({
      data: {
        companyId: input.companyId,
        clientId: input.clientId,
        status: "draft",
        totalExclTax: totals.totalExclTax,
        totalTax: totals.totalTax,
        totalInclTax: totals.totalInclTax,
        lines: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            tvaRate: line.tvaRate,
            lineTotalExclTax: line.quantity * line.unitPrice,
          })),
        },
        statusHistory: {
          create: { fromStatus: null, toStatus: "draft", actorUserId: ctx.userId },
        },
      },
      include: { lines: true },
    });
  }),

  issue: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx);
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { lines: true },
      });
      assertCompanyAccess(ctx, invoice.companyId);
      if (invoice.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seule une facture brouillon peut etre emise." });
      }

      // Note: concurrent issue calls can race on `issuedCount`/numbering; the
      // @@unique([companyId, invoiceNumber]) constraint prevents a duplicate
      // number from being persisted, but the loser gets a raw DB error rather
      // than a friendly retry. Acceptable for MVP volume, worth revisiting
      // before this handles real concurrent traffic.
      const previousIssued = await ctx.prisma.invoice.findFirst({
        where: { companyId: invoice.companyId, status: { not: "draft" } },
        orderBy: { issueDate: "desc" },
        select: { hash: true },
      });

      const issuedCount = await ctx.prisma.invoice.count({
        where: { companyId: invoice.companyId, status: { not: "draft" } },
      });
      const invoiceNumber = `INV-${String(issuedCount + 1).padStart(6, "0")}`;
      const issueDate = new Date();

      const canonicalPayload = JSON.stringify({
        companyId: invoice.companyId,
        clientId: invoice.clientId,
        invoiceNumber,
        totalExclTax: invoice.totalExclTax.toString(),
        totalTax: invoice.totalTax.toString(),
        totalInclTax: invoice.totalInclTax.toString(),
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity.toString(),
          unitPrice: l.unitPrice.toString(),
          tvaRate: l.tvaRate.toString(),
        })),
      });
      const previousInvoiceHash = previousIssued?.hash ?? "";
      const hash = createHash("sha256").update(previousInvoiceHash + canonicalPayload).digest("hex");

      const issued = await ctx.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "issued",
          invoiceNumber,
          issueDate,
          hash,
          previousInvoiceHash: previousIssued?.hash,
          statusHistory: {
            create: { fromStatus: "draft", toStatus: "issued", actorUserId: ctx.userId },
          },
        },
        include: { lines: true },
      });

      // A credit note voids the invoice it corrects the moment it's actually
      // issued (not when merely drafted) — the corrected invoice keeps its
      // own hash-chained history intact, "void" is just its final state.
      if (issued.correctsInvoiceId) {
        const corrected = await ctx.prisma.invoice.findUniqueOrThrow({
          where: { id: issued.correctsInvoiceId },
          select: { status: true },
        });
        await ctx.prisma.invoice.update({
          where: { id: issued.correctsInvoiceId },
          data: {
            status: "void",
            statusHistory: {
              create: {
                fromStatus: corrected.status,
                toStatus: "void",
                actorUserId: ctx.userId,
                note: `Annulee par la note de credit ${issued.invoiceNumber}`,
              },
            },
          },
        });
      }

      return issued;
    }),

  /**
   * Full credit note: negates every line of an already-issued invoice and
   * links back via correctsInvoiceId. Created as a draft like any other
   * invoice — it goes through the normal issue flow (own number, own link
   * in the hash chain) rather than being auto-issued, so the user reviews it
   * first. The original invoice only flips to "void" once this is issued
   * (see the `issue` mutation above), not at creation time.
   */
  createCreditNote: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx);
      const original = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { lines: true },
      });
      assertCompanyAccess(ctx, original.companyId);
      if (!["issued", "submitted", "cleared"].includes(original.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seule une facture emise (ou soumise/validee) peut etre avoiree par une note de credit.",
        });
      }

      const existingCreditNote = await ctx.prisma.invoice.findFirst({
        where: { correctsInvoiceId: original.id },
      });
      if (existingCreditNote) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Une note de credit existe deja pour cette facture.",
        });
      }

      const totals = computeTotals(
        original.lines.map((line) => ({
          quantity: -Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          tvaRate: Number(line.tvaRate),
        })),
      );

      return ctx.prisma.invoice.create({
        data: {
          companyId: original.companyId,
          clientId: original.clientId,
          correctsInvoiceId: original.id,
          status: "draft",
          currency: original.currency,
          totalExclTax: totals.totalExclTax,
          totalTax: totals.totalTax,
          totalInclTax: totals.totalInclTax,
          lines: {
            create: original.lines.map((line) => ({
              productId: line.productId,
              description: `Avoir - ${line.description}`,
              quantity: -Number(line.quantity),
              unitPrice: line.unitPrice,
              tvaRate: line.tvaRate,
              lineTotalExclTax: -Number(line.lineTotalExclTax),
            })),
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: "draft", actorUserId: ctx.userId },
          },
        },
        include: { lines: true },
      });
    }),

  /**
   * Mutation, not query: each call generates and persists a new immutable
   * document version (storage object + InvoiceDocument row), so it isn't
   * safe for React Query to retry/refetch/prefetch silently.
   */
  generatePdf: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { lines: true, company: true, client: true },
      });
      assertCompanyAccess(ctx, invoice.companyId);
      if (invoice.status === "draft" || !invoice.invoiceNumber || !invoice.issueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Emettez la facture avant de generer le PDF.",
        });
      }

      const pdf = await generateInvoicePdf({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        currency: invoice.currency,
        supplier: toPartyPayload(invoice.company),
        customer: toPartyPayload(invoice.client),
        lines: invoice.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          tvaRate: Number(line.tvaRate),
          lineTotalExclTax: Number(line.lineTotalExclTax),
        })),
        totals: {
          exclTax: Number(invoice.totalExclTax),
          tax: Number(invoice.totalTax),
          inclTax: Number(invoice.totalInclTax),
        },
        hash: invoice.hash ?? undefined,
      });

      const version = (await ctx.prisma.invoiceDocument.count({
        where: { invoiceId: invoice.id, kind: "pdf" },
      })) + 1;
      const { storageKey, sha256 } = await uploadInvoiceDocument({
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        kind: "pdf",
        version,
        data: pdf,
      });
      await ctx.prisma.invoiceDocument.create({
        data: { invoiceId: invoice.id, kind: "pdf", storageKey, sha256, version },
      });

      return { filename: `${invoice.invoiceNumber}.pdf`, base64: pdf.toString("base64") };
    }),

  generateUbl: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { lines: { include: { product: true } }, company: true, client: true },
      });
      assertCompanyAccess(ctx, invoice.companyId);
      if (invoice.status === "draft" || !invoice.invoiceNumber || !invoice.issueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Emettez la facture avant de generer le fichier UBL.",
        });
      }

      const xml = generateUblInvoiceXml({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        currency: invoice.currency,
        supplier: toPartyPayload(invoice.company),
        customer: toPartyPayload(invoice.client),
        lines: invoice.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit: line.product?.unit ?? "unite",
          unitPrice: Number(line.unitPrice),
          tvaRate: Number(line.tvaRate),
          lineTotalExclTax: Number(line.lineTotalExclTax),
        })),
        totals: {
          exclTax: Number(invoice.totalExclTax),
          tax: Number(invoice.totalTax),
          inclTax: Number(invoice.totalInclTax),
        },
      });

      const version = (await ctx.prisma.invoiceDocument.count({
        where: { invoiceId: invoice.id, kind: "ubl_xml" },
      })) + 1;
      const { storageKey, sha256 } = await uploadInvoiceDocument({
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        kind: "ubl_xml",
        version,
        data: Buffer.from(xml, "utf-8"),
      });
      await ctx.prisma.invoiceDocument.create({
        data: { invoiceId: invoice.id, kind: "ubl_xml", storageKey, sha256, version },
      });

      return { filename: `${invoice.invoiceNumber}.xml`, xml };
    }),

  /**
   * issued -> submitted -> cleared/rejected against whatever
   * DgiClearanceProvider the company's clearanceMode resolves to. The
   * intermediate "submitted" row is persisted before calling the provider so
   * a crash mid-call leaves an honest, resumable state rather than silently
   * reverting to "issued".
   */
  submit: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx);
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { lines: true, company: true, client: true },
      });
      assertCompanyAccess(ctx, invoice.companyId);
      if (invoice.status !== "issued" || !invoice.invoiceNumber || !invoice.issueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seule une facture emise peut etre soumise a la DGI.",
        });
      }

      const provider = getClearanceProvider(invoice.company.clearanceMode);

      const ublInput: UblInvoiceInput = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString(),
        currency: invoice.currency,
        supplier: toPartyPayload(invoice.company),
        customer: toPartyPayload(invoice.client),
        lines: invoice.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          tvaRate: Number(line.tvaRate),
        })),
        totals: {
          exclTax: Number(invoice.totalExclTax),
          tax: Number(invoice.totalTax),
          inclTax: Number(invoice.totalInclTax),
        },
      };

      await ctx.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "submitted",
          statusHistory: {
            create: { fromStatus: "issued", toStatus: "submitted", actorUserId: ctx.userId },
          },
        },
      });

      const result = await provider.submit(ublInput);

      let submissionStatus: "accepted" | "rejected" | "error";
      let responsePayload: unknown;
      let errorDetail: string | undefined;
      let nextInvoiceStatus: "cleared" | "rejected" | null;

      if (result.outcome === "accepted") {
        submissionStatus = "accepted";
        responsePayload = result.rawResponse;
        nextInvoiceStatus = "cleared";
      } else if (result.outcome === "rejected") {
        submissionStatus = "rejected";
        responsePayload = result.rawResponse;
        errorDetail = result.reason;
        nextInvoiceStatus = "rejected";
      } else {
        submissionStatus = "error";
        errorDetail = result.message;
        nextInvoiceStatus = null;
      }

      await ctx.prisma.dgiSubmission.create({
        data: {
          invoiceId: invoice.id,
          provider: provider.providerName,
          status: submissionStatus,
          requestPayload: ublInput as unknown as Prisma.InputJsonValue,
          responsePayload: responsePayload as Prisma.InputJsonValue | undefined,
          errorDetail,
        },
      });

      // outcome === "error" leaves the invoice at "submitted" so it can be
      // retried without re-issuing (issuing is one-shot: numbering + hash).
      if (nextInvoiceStatus) {
        await ctx.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextInvoiceStatus,
            statusHistory: {
              create: { fromStatus: "submitted", toStatus: nextInvoiceStatus, actorUserId: ctx.userId },
            },
          },
        });
      }

      return ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { lines: true, dgiSubmissions: true },
      });
    }),
});
