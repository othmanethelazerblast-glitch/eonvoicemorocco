import { router } from "../trpc";
import { organizationRouter } from "./organization";
import { companyRouter } from "./company";
import { clientRouter } from "./client";
import { productRouter } from "./product";
import { invoiceRouter } from "./invoice";

export const appRouter = router({
  organization: organizationRouter,
  company: companyRouter,
  clients: clientRouter,
  products: productRouter,
  invoice: invoiceRouter,
});

export type AppRouter = typeof appRouter;
