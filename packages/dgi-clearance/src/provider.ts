import type { UblInvoiceInput } from "@app/shared-types";

export type ClearanceResult =
  | { outcome: "accepted"; dgiReference: string; clearedAt: string; rawResponse: unknown }
  | { outcome: "rejected"; reason: string; rawResponse: unknown }
  | { outcome: "error"; message: string };

/**
 * The single integration point with Morocco's DGI e-invoicing platform.
 * DGI has not published its own direct API or CSP accreditation process
 * yet, so the entire product ships against `StubClearanceProvider` by
 * default. `EfactClearanceProvider` is a real third-party middleware
 * (efact.ma) usable today against their sandbox. When DGI's own API lands,
 * a new class implementing this interface (e.g. XhubClearanceProvider) is
 * the only new code required — no changes to the invoice data model, UI, or
 * issuing flow.
 */
export interface DgiClearanceProvider {
  readonly providerName: "stub" | "xhub" | "efact";
  submit(invoice: UblInvoiceInput): Promise<ClearanceResult>;
}
