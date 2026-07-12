import { z } from "zod";
import { currencySchema, tvaRateSchema } from "./tax";

/** Catalog entry. Maps to UBL Item + TaxCategory. */
export const productSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1),
  unit: z.string().default("unite"),
  defaultUnitPrice: z.number().nonnegative(),
  currency: currencySchema,
  tvaRate: tvaRateSchema,
  createdAt: z.date(),
});
export type Product = z.infer<typeof productSchema>;
