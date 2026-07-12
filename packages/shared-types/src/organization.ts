import { z } from "zod";

/** Org-level role. "accountant"/"bookkeeper" are firm staff who may be
 * restricted to a subset of companies via CompanyAccess. */
export const orgRoleSchema = z.enum(["owner", "admin", "accountant", "bookkeeper", "viewer"]);
export type OrgRole = z.infer<typeof orgRoleSchema>;

export const organizationSchema = z.object({
  id: z.string().uuid(),
  clerkOrgId: z.string(),
  name: z.string().min(1),
  /** A direct SME signup has exactly one Company; an accounting firm has many.
   * Same entity either way — no separate "account type" field needed. */
  createdAt: z.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const membershipSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: orgRoleSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

/** Per-company grant for firm staff who only handle a subset of clients.
 * Owner/admin roles implicitly have access to all companies in the org. */
export const companyAccessSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
});
export type CompanyAccess = z.infer<typeof companyAccessSchema>;
