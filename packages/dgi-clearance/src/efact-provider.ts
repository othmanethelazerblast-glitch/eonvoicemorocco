import type { UblInvoiceInput } from "@app/shared-types";
import type { ClearanceResult, DgiClearanceProvider } from "./provider";

const DEFAULT_BASE_URL = "https://api.efact.ma";
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 20_000;

interface EfactInvoiceData {
  id: string;
  status: string;
  dgiReference?: string | null;
  dgiQrPayload?: string | null;
  dgiErrorCode?: string | null;
  dgiErrorMessage?: string | null;
  dgiValidatedAt?: string | null;
}

interface EfactResponse {
  code: string;
  message: string;
  data: EfactInvoiceData;
  errors: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * https://efact.ma — third-party clearance *middleware*, not DGI itself.
 * Their sandbox runs invoices through a real UBL 2.1 + XAdES signing
 * pipeline and only simulates the final DGI callback, so this is a genuine
 * upgrade over StubClearanceProvider for pre-launch testing, not just a
 * rename. Sandbox vs. production is selected by which secret key is used
 * (efact_sk_...), not a URL flag — see EFACT_SECRET_KEY.
 *
 * EFact's create+status endpoints are async (SIGNED -> TRANSMITTED ->
 * ACCEPTED/REJECTED over a few seconds), but DgiClearanceProvider#submit
 * is expected to resolve to a single terminal outcome — so this polls
 * the status endpoint until ACCEPTED/REJECTED or POLL_TIMEOUT_MS elapses.
 * A timeout resolves to "error", which apps/api's submit mutation treats
 * as retryable (invoice stays at "submitted", not silently reverted).
 */
export class EfactClearanceProvider implements DgiClearanceProvider {
  readonly providerName = "efact" as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async submit(invoice: UblInvoiceInput): Promise<ClearanceResult> {
    const customer = invoice.customer as {
      name?: unknown;
      identifiers?: { ice?: unknown };
      address?: { line1?: unknown; city?: unknown };
    };
    const buyerIce = typeof customer.identifiers?.ice === "string" ? customer.identifiers.ice : undefined;
    if (!buyerIce) {
      return {
        outcome: "error",
        message: "Le client n'a pas d'ICE renseigne — requis par EFact/DGI pour la soumission.",
      };
    }

    const body = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate.slice(0, 10),
      currency: invoice.currency,
      // Not yet a field on our Invoice model — fixed default until a real
      // payment-terms field exists; fine for sandbox testing, not for a
      // real production submission.
      paymentMethod: "BANK_TRANSFER",
      buyerIce,
      buyerName: String(customer.name ?? ""),
      buyerAddress: [customer.address?.line1, customer.address?.city].filter(Boolean).join(", "),
      lines: invoice.lines.map((line, index) => {
        const l = line as { description?: unknown; quantity?: unknown; unitPrice?: unknown; tvaRate?: unknown };
        return {
          lineNumber: index + 1,
          description: String(l.description ?? ""),
          quantity: Number(l.quantity ?? 0),
          unitPrice: Number(l.unitPrice ?? 0),
          // Our tvaRate is a fraction (0.20); EFact expects a percentage (20).
          vatRate: Number(l.tvaRate ?? 0) * 100,
        };
      }),
    };

    let created: EfactResponse;
    try {
      created = await this.request("POST", "/v1/invoices", body);
    } catch (err) {
      return { outcome: "error", message: err instanceof Error ? err.message : String(err) };
    }

    return this.pollForOutcome(created);
  }

  private async pollForOutcome(initial: EfactResponse): Promise<ClearanceResult> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let latest = initial;
    while (Date.now() < deadline) {
      if (latest.data.status === "ACCEPTED") {
        return {
          outcome: "accepted",
          dgiReference: String(latest.data.dgiReference ?? ""),
          clearedAt: String(latest.data.dgiValidatedAt ?? new Date().toISOString()),
          rawResponse: latest,
        };
      }
      if (latest.data.status === "REJECTED") {
        return {
          outcome: "rejected",
          reason: String(latest.data.dgiErrorMessage ?? "Rejetee par EFact/DGI"),
          rawResponse: latest,
        };
      }
      await sleep(POLL_INTERVAL_MS);
      try {
        latest = await this.request("GET", `/v1/invoices/${latest.data.id}/status`);
      } catch (err) {
        return { outcome: "error", message: err instanceof Error ? err.message : String(err) };
      }
    }
    return {
      outcome: "error",
      message: `EFact: pas de statut definitif apres ${POLL_TIMEOUT_MS / 1000}s (dernier statut: ${latest.data.status}).`,
    };
  }

  private async request(method: "GET" | "POST", path: string, body?: unknown): Promise<EfactResponse> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as EfactResponse;
    if (!res.ok || json.code !== "OK") {
      throw new Error(`EFact ${res.status} ${json.code}: ${json.message}`);
    }
    return json;
  }
}
