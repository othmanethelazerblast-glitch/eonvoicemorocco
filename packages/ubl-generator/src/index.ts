import { escapeXml, formatAmount, formatIsoDate, formatPercent, toUnitCode } from "./format";
import type { UblInvoiceXmlInput, UblParty } from "./types";

export type { UblInvoiceXmlInput, UblParty, UblAddress, UblPartyIdentifiers, UblInvoiceLine } from "./types";

const NAMESPACES =
  'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ' +
  'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" ' +
  'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"';

/** Renders an issued invoice as UBL 2.1 Invoice XML — the wire format the
 * Prisma schema's field comments ("Maps to UBL ...") document this product
 * as targeting. Purely a serializer: it trusts the caller for correctness of
 * totals, same as @app/pdf-generator. */
export function generateUblInvoiceXml(input: UblInvoiceXmlInput): string {
  const taxSubtotals = groupLinesByTvaRate(input.lines);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<Invoice ${NAMESPACES}>`,
    "  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>",
    `  <cbc:ID>${escapeXml(input.invoiceNumber)}</cbc:ID>`,
    `  <cbc:IssueDate>${formatIsoDate(input.issueDate)}</cbc:IssueDate>`,
    "  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>",
    `  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>`,
    renderPartyBlock("cac:AccountingSupplierParty", input.supplier),
    renderPartyBlock("cac:AccountingCustomerParty", input.customer),
    renderTaxTotal(input.currency, input.totals.tax, taxSubtotals),
    renderLegalMonetaryTotal(input.currency, input.totals),
    ...input.lines.map((line, index) => renderInvoiceLine(index + 1, input.currency, line)),
    "</Invoice>",
  ].join("\n");
}

function renderPartyBlock(tag: string, party: UblParty): string {
  const { address, identifiers } = party;
  return [
    `  <${tag}>`,
    "    <cac:Party>",
    identifiers.ice
      ? `      <cac:PartyIdentification><cbc:ID schemeID="ICE">${escapeXml(identifiers.ice)}</cbc:ID></cac:PartyIdentification>`
      : "",
    "      <cac:PartyName>",
    `        <cbc:Name>${escapeXml(party.name)}</cbc:Name>`,
    "      </cac:PartyName>",
    "      <cac:PostalAddress>",
    `        <cbc:StreetName>${escapeXml(address.line1)}</cbc:StreetName>`,
    address.line2 ? `        <cbc:AdditionalStreetName>${escapeXml(address.line2)}</cbc:AdditionalStreetName>` : "",
    `        <cbc:CityName>${escapeXml(address.city)}</cbc:CityName>`,
    address.postalCode ? `        <cbc:PostalZone>${escapeXml(address.postalCode)}</cbc:PostalZone>` : "",
    "        <cac:Country>",
    `          <cbc:IdentificationCode>${escapeXml(address.country)}</cbc:IdentificationCode>`,
    "        </cac:Country>",
    "      </cac:PostalAddress>",
    identifiers.identifiantFiscal
      ? [
          "      <cac:PartyTaxScheme>",
          `        <cbc:CompanyID>${escapeXml(identifiers.identifiantFiscal)}</cbc:CompanyID>`,
          "        <cac:TaxScheme>",
          "          <cbc:ID>TVA</cbc:ID>",
          "        </cac:TaxScheme>",
          "      </cac:PartyTaxScheme>",
        ].join("\n")
      : "",
    "      <cac:PartyLegalEntity>",
    `        <cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName>`,
    identifiers.registreCommerce
      ? `        <cbc:CompanyID schemeID="RC">${escapeXml(identifiers.registreCommerce)}</cbc:CompanyID>`
      : "",
    "      </cac:PartyLegalEntity>",
    "    </cac:Party>",
    `  </${tag}>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function groupLinesByTvaRate(lines: UblInvoiceXmlInput["lines"]): Map<number, { taxable: number; tax: number }> {
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const line of lines) {
    const entry = byRate.get(line.tvaRate) ?? { taxable: 0, tax: 0 };
    entry.taxable += line.lineTotalExclTax;
    entry.tax += line.lineTotalExclTax * line.tvaRate;
    byRate.set(line.tvaRate, entry);
  }
  return byRate;
}

function renderTaxTotal(currency: string, totalTax: number, byRate: Map<number, { taxable: number; tax: number }>): string {
  const subtotals = [...byRate.entries()].map(
    ([rate, { taxable, tax }]) =>
      [
        "    <cac:TaxSubtotal>",
        `      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${formatAmount(taxable)}</cbc:TaxableAmount>`,
        `      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${formatAmount(tax)}</cbc:TaxAmount>`,
        "      <cac:TaxCategory>",
        `        <cbc:Percent>${formatPercent(rate)}</cbc:Percent>`,
        "        <cac:TaxScheme>",
        "          <cbc:ID>TVA</cbc:ID>",
        "        </cac:TaxScheme>",
        "      </cac:TaxCategory>",
        "    </cac:TaxSubtotal>",
      ].join("\n"),
  );

  return [
    "  <cac:TaxTotal>",
    `    <cbc:TaxAmount currencyID="${escapeXml(currency)}">${formatAmount(totalTax)}</cbc:TaxAmount>`,
    ...subtotals,
    "  </cac:TaxTotal>",
  ].join("\n");
}

function renderLegalMonetaryTotal(currency: string, totals: UblInvoiceXmlInput["totals"]): string {
  const cur = escapeXml(currency);
  return [
    "  <cac:LegalMonetaryTotal>",
    `    <cbc:LineExtensionAmount currencyID="${cur}">${formatAmount(totals.exclTax)}</cbc:LineExtensionAmount>`,
    `    <cbc:TaxExclusiveAmount currencyID="${cur}">${formatAmount(totals.exclTax)}</cbc:TaxExclusiveAmount>`,
    `    <cbc:TaxInclusiveAmount currencyID="${cur}">${formatAmount(totals.inclTax)}</cbc:TaxInclusiveAmount>`,
    `    <cbc:PayableAmount currencyID="${cur}">${formatAmount(totals.inclTax)}</cbc:PayableAmount>`,
    "  </cac:LegalMonetaryTotal>",
  ].join("\n");
}

function renderInvoiceLine(id: number, currency: string, line: UblInvoiceXmlInput["lines"][number]): string {
  const cur = escapeXml(currency);
  return [
    "  <cac:InvoiceLine>",
    `    <cbc:ID>${id}</cbc:ID>`,
    `    <cbc:InvoicedQuantity unitCode="${toUnitCode(line.unit)}">${line.quantity}</cbc:InvoicedQuantity>`,
    `    <cbc:LineExtensionAmount currencyID="${cur}">${formatAmount(line.lineTotalExclTax)}</cbc:LineExtensionAmount>`,
    "    <cac:Item>",
    `      <cbc:Description>${escapeXml(line.description)}</cbc:Description>`,
    "      <cac:ClassifiedTaxCategory>",
    `        <cbc:Percent>${formatPercent(line.tvaRate)}</cbc:Percent>`,
    "        <cac:TaxScheme>",
    "          <cbc:ID>TVA</cbc:ID>",
    "        </cac:TaxScheme>",
    "      </cac:ClassifiedTaxCategory>",
    "    </cac:Item>",
    "    <cac:Price>",
    `      <cbc:PriceAmount currencyID="${cur}">${formatAmount(line.unitPrice)}</cbc:PriceAmount>`,
    "    </cac:Price>",
    "  </cac:InvoiceLine>",
  ].join("\n");
}
