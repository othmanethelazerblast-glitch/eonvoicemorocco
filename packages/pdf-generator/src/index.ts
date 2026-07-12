import PDFDocument from "pdfkit";
import { formatAddress, formatDate, formatIdentifiers, formatMoney, formatPercent } from "./format";
import type { InvoicePdfInput } from "./types";

export type { InvoicePdfInput, PdfParty, PdfAddress, PdfPartyIdentifiers, PdfInvoiceLine } from "./types";

const PAGE_MARGIN = 50;
const COLUMNS = [
  { key: "description", label: "Description", width: 220 },
  { key: "quantity", label: "Qte", width: 55, align: "right" as const },
  { key: "unitPrice", label: "Prix unit.", width: 85, align: "right" as const },
  { key: "tvaRate", label: "TVA", width: 50, align: "right" as const },
  { key: "lineTotalExclTax", label: "Total HT", width: 90, align: "right" as const },
];

/** Renders an issued invoice as a one-page PDF. Purely a rendering function —
 * it trusts the caller for correctness of totals/hash; it does not recompute
 * or validate them. */
export function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderHeader(doc, input);
    renderParties(doc, input);
    renderLinesTable(doc, input);
    renderTotals(doc, input);
    renderFooter(doc, input);

    doc.end();
  });
}

function renderHeader(doc: PDFKit.PDFDocument, input: InvoicePdfInput) {
  doc.font("Helvetica-Bold").fontSize(20).text(input.supplier.name, PAGE_MARGIN, PAGE_MARGIN);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("FACTURE", 0, PAGE_MARGIN, { align: "right" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`N ${input.invoiceNumber}`, { align: "right" })
    .text(`Date d'emission : ${formatDate(input.issueDate)}`, { align: "right" });

  doc.moveDown(2);
}

function renderParties(doc: PDFKit.PDFDocument, input: InvoicePdfInput) {
  const top = doc.y;
  const colWidth = (doc.page.width - PAGE_MARGIN * 2) / 2;

  doc.font("Helvetica-Bold").fontSize(9).text("EMETTEUR", PAGE_MARGIN, top);
  doc.font("Helvetica").fontSize(9);
  const supplierLines = [
    input.supplier.name,
    ...formatAddress(input.supplier.address),
    ...formatIdentifiers(input.supplier.identifiers),
  ];
  doc.text(supplierLines.join("\n"), PAGE_MARGIN, doc.y + 4, { width: colWidth - 10 });

  const supplierBottom = doc.y;

  doc.font("Helvetica-Bold").fontSize(9).text("CLIENT", PAGE_MARGIN + colWidth, top);
  doc.font("Helvetica").fontSize(9);
  const customerLines = [
    input.customer.name,
    ...formatAddress(input.customer.address),
    ...formatIdentifiers(input.customer.identifiers),
  ];
  doc.text(customerLines.join("\n"), PAGE_MARGIN + colWidth, top + 13, { width: colWidth - 10 });

  doc.y = Math.max(supplierBottom, doc.y) + 24;
}

function renderLinesTable(doc: PDFKit.PDFDocument, input: InvoicePdfInput) {
  const tableTop = doc.y;
  let y = tableTop;

  doc.font("Helvetica-Bold").fontSize(9);
  let x = PAGE_MARGIN;
  for (const col of COLUMNS) {
    doc.text(col.label, x, y, { width: col.width, align: col.align ?? "left" });
    x += col.width;
  }
  y += 16;
  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_MARGIN + COLUMNS.reduce((sum, c) => sum + c.width, 0), y)
    .strokeColor("#cccccc")
    .stroke();
  y += 6;

  doc.font("Helvetica").fontSize(9);
  for (const line of input.lines) {
    const rowValues: Record<string, string> = {
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: formatMoney(line.unitPrice, input.currency),
      tvaRate: formatPercent(line.tvaRate),
      lineTotalExclTax: formatMoney(line.lineTotalExclTax, input.currency),
    };

    x = PAGE_MARGIN;
    const rowHeight = doc.heightOfString(line.description, { width: COLUMNS[0]!.width });
    for (const col of COLUMNS) {
      doc.text(rowValues[col.key] ?? "", x, y, { width: col.width, align: col.align ?? "left" });
      x += col.width;
    }
    y += Math.max(rowHeight, 14) + 6;
  }

  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_MARGIN + COLUMNS.reduce((sum, c) => sum + c.width, 0), y)
    .strokeColor("#cccccc")
    .stroke();

  doc.y = y + 10;
}

function renderTotals(doc: PDFKit.PDFDocument, input: InvoicePdfInput) {
  const labelWidth = 100;
  const valueWidth = 90;
  const x = doc.page.width - PAGE_MARGIN - labelWidth - valueWidth;

  const rows: [string, string][] = [
    ["Total HT", formatMoney(input.totals.exclTax, input.currency)],
    ["Total TVA", formatMoney(input.totals.tax, input.currency)],
    ["Total TTC", formatMoney(input.totals.inclTax, input.currency)],
  ];

  let y = doc.y + 10;
  for (const [label, value] of rows) {
    const isTotal = label === "Total TTC";
    doc.font(isTotal ? "Helvetica-Bold" : "Helvetica").fontSize(10);
    doc.text(label, x, y, { width: labelWidth });
    doc.text(value, x + labelWidth, y, { width: valueWidth, align: "right" });
    y += 16;
  }
  doc.y = y;
}

function renderFooter(doc: PDFKit.PDFDocument, input: InvoicePdfInput) {
  const bottom = doc.page.height - PAGE_MARGIN;
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#888888")
    .text(
      input.hash ? `Empreinte de la facture (chainage) : ${input.hash}` : "",
      PAGE_MARGIN,
      bottom - 20,
      { width: doc.page.width - PAGE_MARGIN * 2 },
    );
}
