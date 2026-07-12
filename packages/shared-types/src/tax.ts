import { z } from "zod";

/** Moroccan VAT (TVA) rates in effect today. Kept as an enum, not free-form,
 * so invoice totals and future UBL TaxCategory mapping stay unambiguous. */
export const TVA_RATES = [0.2, 0.14, 0.1, 0.07, 0] as const;
export const tvaRateSchema = z.enum(["0.20", "0.14", "0.10", "0.07", "0.00"]);
export type TvaRate = z.infer<typeof tvaRateSchema>;

export const currencySchema = z.enum(["MAD", "EUR", "USD"]).default("MAD");
export type Currency = z.infer<typeof currencySchema>;

/** Legal identifiers shared by both Company (issuer) and Client (recipient) —
 * mirrors UBL's Party structure so both sides of an invoice map cleanly. */
export const partyIdentifiersSchema = z.object({
  ice: z.string().regex(/^\d{15}$/, "ICE must be 15 digits").optional(),
  identifiantFiscal: z.string().min(1).optional(),
  registreCommerce: z.string().min(1).optional(),
  patente: z.string().min(1).optional(),
});
export type PartyIdentifiers = z.infer<typeof partyIdentifiersSchema>;

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().optional(),
  country: z.string().length(2).default("MA"),
});
export type Address = z.infer<typeof addressSchema>;
