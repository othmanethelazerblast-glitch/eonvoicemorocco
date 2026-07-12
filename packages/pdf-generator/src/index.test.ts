import { describe, expect, it } from "vitest";
import { generateInvoicePdf } from "./index";
import type { InvoicePdfInput } from "./types";

const baseInput: InvoicePdfInput = {
  invoiceNumber: "INV-000042",
  issueDate: new Date("2026-07-11"),
  currency: "MAD",
  supplier: {
    name: "Atlas Consulting SARL",
    address: { line1: "12 Rue Ibn Sina", city: "Rabat", postalCode: "10000", country: "MA" },
    identifiers: { ice: "001234567000089", identifiantFiscal: "IF-778899" },
  },
  customer: {
    name: "Client Test SA",
    address: { line1: "5 Boulevard Zerktouni", city: "Casablanca", country: "MA" },
    identifiers: {},
  },
  lines: [
    { description: "Prestation de conseil", quantity: 10, unitPrice: 800, tvaRate: 0.2, lineTotalExclTax: 8000 },
  ],
  totals: { exclTax: 8000, tax: 1600, inclTax: 9600 },
};

describe("generateInvoicePdf", () => {
  it("produces a well-formed PDF buffer", async () => {
    const pdf = await generateInvoicePdf(baseInput);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.subarray(-6).toString("latin1").trim()).toBe("%%EOF");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("handles multiple lines and omitted optional fields (no line2, no hash)", async () => {
    const pdf = await generateInvoicePdf({
      ...baseInput,
      hash: undefined,
      lines: [
        ...baseInput.lines,
        { description: "Frais de deplacement", quantity: 1, unitPrice: 450.5, tvaRate: 0.1, lineTotalExclTax: 450.5 },
      ],
    });

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("includes the hash footer when a hash is provided", async () => {
    const withHash = await generateInvoicePdf({ ...baseInput, hash: "a".repeat(64) });
    const withoutHash = await generateInvoicePdf({ ...baseInput, hash: undefined });

    // The hash footer text adds real content bytes to the page stream, so a
    // PDF that includes it is strictly larger than one that doesn't.
    expect(withHash.length).toBeGreaterThan(withoutHash.length);
  });
});
