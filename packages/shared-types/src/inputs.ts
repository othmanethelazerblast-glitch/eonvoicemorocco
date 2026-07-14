import { z } from "zod";
import { addressSchema, currencySchema, partyIdentifiersSchema, TVA_RATES } from "./tax";

/** Reusable create/update payload shapes, shared between tRPC routers and
 * web forms so a rule (e.g. "ICE is 15 digits") is written once and can't
 * drift between create and update, or between client and server. */

export const companyInput = z.object({
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  defaultCurrency: currencySchema,
});
export type CompanyInput = z.infer<typeof companyInput>;

export const clientInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  identifiers: partyIdentifiersSchema,
  address: addressSchema,
  email: z.string().email().optional(),
});
export type ClientInput = z.infer<typeof clientInput>;

export const tvaRateInput = z.number().refine((v) => (TVA_RATES as readonly number[]).includes(v), {
  message: "Taux de TVA invalide",
});

export const productInput = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  unit: z.string().default("unite"),
  defaultUnitPrice: z.number().nonnegative(),
  tvaRate: tvaRateInput,
});
export type ProductInput = z.infer<typeof productInput>;

export const prospectInviteCreateInput = z.object({
  email: z.string().email(),
  contactName: z.string().min(1).optional(),
});
export type ProspectInviteCreateInput = z.infer<typeof prospectInviteCreateInput>;

/** What a prospect fills in on the public onboarding form — same shape as
 * companyInput, reused rather than redefined, since it becomes a Company
 * as-is once a staff member approves it. */
export const prospectSubmissionInput = companyInput;
export type ProspectSubmissionInput = z.infer<typeof prospectSubmissionInput>;
