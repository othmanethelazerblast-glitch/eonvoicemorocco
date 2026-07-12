import { z } from "zod";
import { currencySchema, tvaRateSchema } from "./tax";

/**
 * Status lifecycle. `submitted`/`cleared`/`rejected` are reachable once a
 * company's clearanceMode is "live" (post real-DGI-integration). `void` is
 * only reachable via a linked credit note — invoices are never deleted, to
 * satisfy Morocco's ~10-year retention requirement.
 */
export const invoiceStatusSchema = z.enum([
  "draft",
  "issued",
  "submitted",
  "cleared",
  "rejected",
  "void",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/** Maps to UBL InvoiceLine. */
export const invoiceLineSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  tvaRate: tvaRateSchema,
  lineTotalExclTax: z.number().nonnegative(),
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

/** Invoice header. Maps to UBL Invoice + LegalMonetaryTotal + TaxTotal. */
export const invoiceSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  clientId: z.string().uuid(),
  /** Sequential per-company, assigned atomically at issue time and immutable
   * thereafter — never reused, never renumbered. */
  invoiceNumber: z.string().min(1).optional(),
  status: invoiceStatusSchema,
  currency: currencySchema,
  issueDate: z.date().optional(),
  totalExclTax: z.number().nonnegative(),
  totalTax: z.number().nonnegative(),
  totalInclTax: z.number().nonnegative(),
  /** SHA-256 of (this invoice's canonical payload + previous invoice's hash),
   * per company. Added now because retrofitting a hash chain onto historical
   * data later is not realistic. */
  hash: z.string().length(64).optional(),
  previousInvoiceHash: z.string().length(64).optional(),
  /** Set only for credit notes; the invoice this one corrects/voids. */
  correctsInvoiceId: z.string().uuid().optional(),
  createdAt: z.date(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceDocumentKindSchema = z.enum(["pdf", "ubl_xml", "cii_xml", "dgi_receipt"]);
export type InvoiceDocumentKind = z.infer<typeof invoiceDocumentKindSchema>;

/** Generated artifact for an invoice. Append-only — a re-generated PDF adds a
 * new row/version, it never overwrites the previous one. */
export const invoiceDocumentSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  kind: invoiceDocumentKindSchema,
  storageKey: z.string().min(1),
  sha256: z.string().length(64),
  version: z.number().int().positive(),
  createdAt: z.date(),
});
export type InvoiceDocument = z.infer<typeof invoiceDocumentSchema>;
