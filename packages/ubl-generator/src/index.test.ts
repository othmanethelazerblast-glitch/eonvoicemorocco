import { describe, expect, it } from "vitest";
import { generateUblInvoiceXml } from "./index";
import type { UblInvoiceXmlInput } from "./types";

const baseInput: UblInvoiceXmlInput = {
  invoiceNumber: "INV-000042",
  issueDate: new Date("2026-07-11T00:00:00Z"),
  currency: "MAD",
  supplier: {
    name: "Atlas Consulting SARL",
    address: { line1: "12 Rue Ibn Sina", city: "Rabat", postalCode: "10000", country: "MA" },
    identifiers: { ice: "001234567000089", identifiantFiscal: "IF-778899", registreCommerce: "RC-45566" },
  },
  customer: {
    name: "Client & Co <Test> SA",
    address: { line1: "5 Boulevard Zerktouni", city: "Casablanca", country: "MA" },
    identifiers: { ice: "009876543000012" },
  },
  lines: [
    { description: "Prestation de conseil", quantity: 10, unit: "heure", unitPrice: 800, tvaRate: 0.2, lineTotalExclTax: 8000 },
    { description: "Frais de deplacement", quantity: 1, unit: "unite", unitPrice: 450.5, tvaRate: 0.1, lineTotalExclTax: 450.5 },
  ],
  totals: { exclTax: 8450.5, tax: 1645.05, inclTax: 10095.55 },
};

function countOccurrences(haystack: string, tag: string): number {
  return (haystack.match(new RegExp(`<${tag}[ >]`, "g")) ?? []).length;
}

describe("generateUblInvoiceXml", () => {
  it("produces a well-formed UBL document with matching open/close tags", () => {
    const xml = generateUblInvoiceXml(baseInput);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
    expect(xml.trim().endsWith("</Invoice>")).toBe(true);

    // Every opening tag has a matching closing tag (order-agnostic count check).
    const openTags = xml.match(/<([a-zA-Z0-9:]+)(?:\s[^>]*)?(?<!\/)>/g) ?? [];
    const closeTags = xml.match(/<\/([a-zA-Z0-9:]+)>/g) ?? [];
    expect(closeTags.length).toBe(openTags.length);
  });

  it("escapes special characters in party names", () => {
    const xml = generateUblInvoiceXml(baseInput);
    expect(xml).toContain("Client &amp; Co &lt;Test&gt; SA");
    expect(xml).not.toContain("Client & Co <Test> SA");
  });

  it("emits one cac:InvoiceLine per input line", () => {
    const xml = generateUblInvoiceXml(baseInput);
    expect(countOccurrences(xml, "cac:InvoiceLine")).toBe(baseInput.lines.length);
  });

  it("groups tax subtotals by distinct TVA rate", () => {
    const xml = generateUblInvoiceXml(baseInput);
    // baseInput has two lines at two different rates (20% and 10%).
    expect(countOccurrences(xml, "cac:TaxSubtotal")).toBe(2);

    const sameRateInput: UblInvoiceXmlInput = {
      ...baseInput,
      lines: baseInput.lines.map((line) => ({ ...line, tvaRate: 0.2 })),
    };
    expect(countOccurrences(generateUblInvoiceXml(sameRateInput), "cac:TaxSubtotal")).toBe(1);
  });

  it("formats totals to two decimal places", () => {
    const xml = generateUblInvoiceXml(baseInput);
    expect(xml).toContain('<cbc:PayableAmount currencyID="MAD">10095.55</cbc:PayableAmount>');
    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="MAD">8450.50</cbc:TaxExclusiveAmount>');
  });
});
