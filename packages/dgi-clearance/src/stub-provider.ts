import type { UblInvoiceInput } from "@app/shared-types";
import type { ClearanceResult, DgiClearanceProvider } from "./provider";

/**
 * Always "accepts" and fabricates a reference, so the full issue -> submit ->
 * cleared flow (and UI) can be built and demoed before DGI's real API exists.
 * Every company defaults to clearanceMode "stubbed" until switched to "live".
 */
export class StubClearanceProvider implements DgiClearanceProvider {
  readonly providerName = "stub" as const;

  async submit(invoice: UblInvoiceInput): Promise<ClearanceResult> {
    return {
      outcome: "accepted",
      dgiReference: `STUB-${invoice.invoiceId}`,
      clearedAt: new Date().toISOString(),
      rawResponse: { note: "stubbed clearance — no real DGI submission occurred" },
    };
  }
}
