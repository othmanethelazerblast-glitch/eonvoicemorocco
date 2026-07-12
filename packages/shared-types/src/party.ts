import { z } from "zod";
import { addressSchema, currencySchema, partyIdentifiersSchema } from "./tax";

/** The invoice-issuing legal entity. Maps to UBL AccountingSupplierParty. */
export const companySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  defaultCurrency: currencySchema,
  /** Drives whether/when this company's invoices attempt real DGI clearance,
   * matching the phased rollout (large 2026, mid 2026, SME/micro 2027). */
  clearanceMode: z.enum(["none", "stubbed", "live"]).default("stubbed"),
  createdAt: z.date(),
});
export type Company = z.infer<typeof companySchema>;

/** The invoice recipient. Maps to UBL AccountingCustomerParty. */
export const clientSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  email: z.string().email().optional(),
  createdAt: z.date(),
});
export type Client = z.infer<typeof clientSchema>;
