import { router } from "../trpc";
import { organizationRouter } from "./organization";
import { companyRouter } from "./company";
import { clientRouter } from "./client";
import { productRouter } from "./product";
import { invoiceRouter } from "./invoice";
import { prospectInviteRouter } from "./prospectInvite";

export const appRouter = router({
  organization: organizationRouter,
  company: companyRouter,
  clients: clientRouter,
  products: productRouter,
  invoice: invoiceRouter,
  prospectInvite: prospectInviteRouter,
});

export type AppRouter = typeof appRouter;
