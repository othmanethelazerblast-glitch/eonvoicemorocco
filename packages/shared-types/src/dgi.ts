import { z } from "zod";

/**
 * The explicit swap point for real DGI/XHub integration once its API and CSP
 * accreditation process are published. `provider` is "stub" for the entire
 * MVP; a real provider is added as a new enum value + implementation, not a
 * schema change.
 */
export const dgiSubmissionStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "error",
]);
export type DgiSubmissionStatus = z.infer<typeof dgiSubmissionStatusSchema>;

export const dgiSubmissionSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  provider: z.enum(["stub", "xhub"]).default("stub"),
  status: dgiSubmissionStatusSchema,
  requestPayload: z.record(z.unknown()).optional(),
  responsePayload: z.record(z.unknown()).optional(),
  errorDetail: z.string().optional(),
  createdAt: z.date(),
});
export type DgiSubmission = z.infer<typeof dgiSubmissionSchema>;

/** A UBL-ready shape of an invoice, independent of any provider's wire
 * format — this is what any DgiClearanceProvider implementation consumes. */
export const ublInvoiceInputSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  issueDate: z.string(), // ISO 8601 date
  currency: z.string(),
  supplier: z.record(z.unknown()),
  customer: z.record(z.unknown()),
  lines: z.array(z.record(z.unknown())),
  totals: z.object({
    exclTax: z.number(),
    tax: z.number(),
    inclTax: z.number(),
  }),
});
export type UblInvoiceInput = z.infer<typeof ublInvoiceInputSchema>;
